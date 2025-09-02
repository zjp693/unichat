// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CelebrityRegistryV1
 * @notice 非可升级的名人信息注册表：链上保存 {name, cid}，并用派生的 nameKey（keccak256(bytes(name))) 与 addr 做双唯一索引。
 * @dev
 * - 批量 upsert（创建/更新）与批量停用；
 * - 活跃集合分页 & 全量（活跃+非活跃）分页；
 * - 通过 OpenZeppelin AccessControl 管理权限（DEFAULT_ADMIN_ROLE 管理 OPERATOR_ROLE）；
 * - 事件不再携带明文 name，以节省 gas。
 * @custom:source NatSpec 注释格式与可用标签参考 Solidity 官方文档（推荐为所有 ABI 暴露项编写）。 
 * @custom:security 使用 AccessControl 的角色控制，请只授予可信地址 OPERATOR_ROLE。
 */
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract CelebrityRegistryV1 is AccessControl {
    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------

    /// @notice 操作员角色：可批量 upsert 与停用
    /// @dev 角色模型与 API 参考 OpenZeppelin AccessControl 文档。 
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ---------------------------------------------------------------------
    // Custom Errors
    // ---------------------------------------------------------------------

    /// @notice 批量入参长度不一致
    error LengthMismatch();
    /// @notice 地址唯一性冲突
    /// @param addr 冲突的地址
    error DuplicateAddress(address addr);
    /// @notice 名字唯一性冲突（nameKey 冲突）
    /// @param nameKey keccak256(bytes(name))
    error DuplicateNameKey(bytes32 nameKey);
    /// @notice 通过 id 未找到记录
    /// @param id 期望的自增主键 id
    error NotFound(uint256 id);
    /// @notice 批量大小过大
    /// @param maxSize 允许的最大批量
    error BatchTooLarge(uint256 maxSize);
    /// @notice 地址为零
    error InvalidAddress();
    /// @notice 名字为空
    error InvalidName();
    /// @notice CID 为空
    error InvalidCid();
    /// @notice 通过 nameKey 未找到记录
    /// @param nameKey keccak256(bytes(name))
    error NotFoundByNameKey(bytes32 nameKey);
    /// @notice 通过地址未找到记录
    /// @param addr 地址
    error NotFoundByAddress(address addr);
    /// @notice 传入的 nameKey 与 addr 同时指向不同记录，触发交叉索引冲突
    /// @param addr 传入地址
    /// @param nameKey 传入名字的哈希
    /// @param idByAddr 通过地址解析到的 id
    /// @param idByName 通过名字哈希解析到的 id
    error CrossIndexCollision(address addr, bytes32 nameKey, uint256 idByAddr, uint256 idByName);

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /**
     * @notice 名人信息结构
     * @dev
     * - `nameKey = keccak256(bytes(name))`，用于 O(1) 按名索引；
     * - `flags` 的第 0 位表示是否活跃。
     */
    struct Person {
        /// @notice 名字哈希（keccak256(bytes(name))）
        bytes32 nameKey;
        /// @notice 名人地址（全局唯一）
        address addr;
        /// @dev bit0: active
        uint8   flags;
        /// @notice 头像/资料等的 IPFS CID（建议 CIDv1 base32，如 "bafy..."）
        string  cid;
        /// @notice 明文名字（链上存储）
        string  name;
    }

    /// @dev bit0：是否活跃
    uint8 private constant FLAG_ACTIVE = 1;
    /// @notice 单次最大批量（防止 DoS）
    uint256 public constant MAX_BATCH = 100;

    /// @notice 自增主键（从 1 开始）
    uint256 private _nextId;
    /// @dev 主表：id -> Person
    mapping(uint256 => Person) private _persons;

    /// @notice 地址到 id 的唯一索引
    mapping(address => uint256) public idOfAddress;
    /// @notice 名字哈希到 id 的唯一索引（name 唯一）
    mapping(bytes32 => uint256) public idOfNameKey;

    /// @dev 活跃集合（分页用）
    uint256[] private _activeIds;
    /// @dev id 在活跃集合中的位置索引（index+1；0 表示不在集合）
    mapping(uint256 => uint256) private _idIndexPlus1;

    // ---------------------------------------------------------------------
    // Events （不包含 name，节省 gas）
    // ---------------------------------------------------------------------

    /**
     * @notice 创建或更新（首次 upsert）后触发
     * @dev 仅携带必要字段；`name` 上链存储，可通过只读接口获取
     * @param id 自增主键
     * @param addr 名人地址
     * @param nameKey keccak256(bytes(name))
     * @param cid 资料 CID 字符串
     * @param active 是否活跃
     */
    event PersonUpserted(
        uint256 indexed id,
        address indexed addr,
        bytes32 indexed nameKey,
        string cid,
        bool active
    );

    /**
     * @notice 非激活状态变更下的更新（字段更新）触发
     * @dev 若发生停用/激活切换，会改为发对应事件，避免重复语义
     */
    event PersonUpdated(
        uint256 indexed id,
        address indexed addr,
        bytes32 indexed nameKey,
        string cid,
        bool active
    );

    /**
     * @notice 停用时触发
     * @param id 被停用的记录 id
     * @param addr 被停用的地址
     * @param nameKey 被停用的名字哈希
     */
    event PersonDeactivated(uint256 indexed id, address indexed addr, bytes32 indexed nameKey);
    // 可选：若需要“重新激活”独立事件，可解注释以下行：
    // event PersonReactivated(uint256 indexed id, address indexed addr, bytes32 indexed nameKey);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /**
     * @notice 构造：设置管理员和操作员角色
     * @param admin 初始管理员（将获得 DEFAULT_ADMIN_ROLE 与 OPERATOR_ROLE）
     */
    constructor(address admin) {
        require(admin != address(0), "zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _nextId = 1;
    }

    // ---------------------------------------------------------------------
    // Write APIs
    // ---------------------------------------------------------------------

    /**
     * @notice 批量 upsert 的单条输入
     * @dev `nameKey` 由合约在链上通过 `keccak256(bytes(name))` 计算；外部无需传入
     */
    struct PersonInput {
        address addr;  /// 名人地址（唯一）
        string  name;  /// 明文名字（链上存储）
        string  cid;   /// 资料 CID（如 "bafy..."）
        bool    active;/// 是否活跃
    }

    /**
     * @notice 批量 upsert（创建/更新）
     * @dev
     * - 若地址与名字哈希均不存在：创建；
     * - 若仅名字存在：按名字定位并“改地址”；
     * - 若仅地址存在：按地址定位并“改名字（nameKey）”；
     * - 若两者都存在：两索引需指向同一条记录，否则回退 CrossIndexCollision。
     * @param inputs 多条 upsert 输入
     */
    function batchUpsert(PersonInput[] calldata inputs)
        external
        onlyRole(OPERATOR_ROLE)
    {
        uint256 len = inputs.length;
        if (len > MAX_BATCH) revert BatchTooLarge(MAX_BATCH);

        for (uint256 i = 0; i < len; ) {
            _upsertSingle(inputs[i]);
            unchecked { ++i; }
        }
    }

    /**
     * @notice 处理单条 upsert
     * @dev 内部使用；按双索引解析并保持一致性
     * @param it 单条输入
     */
    function _upsertSingle(PersonInput calldata it) internal {
        if (it.addr == address(0)) revert InvalidAddress();
        if (bytes(it.name).length == 0) revert InvalidName();
        if (bytes(it.cid).length == 0) revert InvalidCid();

        bytes32 newKey = keccak256(bytes(it.name)); // 派生 nameKey（链上计算）
        uint256 idByName = idOfNameKey[newKey];
        uint256 idByAddr = idOfAddress[it.addr];

        if (idByName == 0 && idByAddr == 0) {
            _createNewPerson(newKey, it);
        } else if (idByName != 0 && idByAddr == 0) {
            _updateByNameKey(idByName, it);
        } else if (idByName == 0 && idByAddr != 0) {
            _updateByAddress(idByAddr, newKey, it);
        } else {
            _updateExisting(idByName, idByAddr, newKey, it);
        }
    }

    /**
     * @notice 创建新记录
     * @param newKey keccak256(bytes(it.name))
     * @param it 输入
     */
    function _createNewPerson(bytes32 newKey, PersonInput calldata it) internal {
        if (idOfNameKey[newKey] != 0) revert DuplicateNameKey(newKey);

        uint256 id = _nextId++;
        Person storage p = _persons[id];
        p.nameKey = newKey;
        p.addr    = it.addr;
        p.cid     = it.cid;
        p.name    = it.name;
        p.flags   = it.active ? FLAG_ACTIVE : 0;

        idOfNameKey[newKey] = id;
        idOfAddress[it.addr] = id;
        if (it.active) _addActive(id);

        emit PersonUpserted(id, p.addr, p.nameKey, p.cid, it.active);
    }

    /**
     * @notice 以 nameKey 为主键更新（场景：name 已存在、addr 尚未存在）
     * @param id 通过 nameKey 解析到的 id
     * @param it 输入
     */
    function _updateByNameKey(uint256 id, PersonInput calldata it) internal {
        Person storage p = _persons[id];

        // 地址索引更新（确保唯一）
        if (p.addr != it.addr) {
            uint256 exists = idOfAddress[it.addr];
            if (exists != 0 && exists != id) revert DuplicateAddress(it.addr);
            idOfAddress[p.addr] = 0;
            idOfAddress[it.addr] = id;
            p.addr = it.addr;
        }

        // 数据更新
        p.cid  = it.cid;
        p.name = it.name;

        bool toggled = _handleActiveToggle(id, p, it.active);
        if (!toggled) {
            emit PersonUpdated(id, p.addr, p.nameKey, p.cid, (p.flags & FLAG_ACTIVE) != 0);
        }
    }

    /**
     * @notice 以地址为主键更新（场景：addr 已存在、name 尚未存在）
     * @param id 通过地址解析到的 id
     * @param newKey 新名字的哈希
     * @param it 输入
     */
    function _updateByAddress(uint256 id, bytes32 newKey, PersonInput calldata it) internal {
        Person storage p = _persons[id];

        // 名字索引更新（确保唯一）
        if (p.nameKey != newKey) {
            uint256 exists = idOfNameKey[newKey];
            if (exists != 0 && exists != id) revert DuplicateNameKey(newKey);
            if (p.nameKey != bytes32(0)) idOfNameKey[p.nameKey] = 0;
            idOfNameKey[newKey] = id;
            p.nameKey = newKey;
        }

        // 数据更新
        p.cid  = it.cid;
        p.name = it.name;

        bool toggled = _handleActiveToggle(id, p, it.active);
        if (!toggled) {
            emit PersonUpdated(id, p.addr, p.nameKey, p.cid, (p.flags & FLAG_ACTIVE) != 0);
        }
    }

    /**
     * @notice 双索引都存在的更新（两者必须指向同一记录）
     * @dev 注意：`newKey` 已移除（曾用于冲突检查，现仅比较 idByName/idByAddr）
     * @param idByName 通过 nameKey 解析到的 id
     * @param idByAddr 通过地址解析到的 id
     * @param it 输入
     */
    function _updateExisting(uint256 idByName, uint256 idByAddr, bytes32 /*newKey*/, PersonInput calldata it) internal {
        if (idByName != idByAddr) {
            revert CrossIndexCollision(it.addr, keccak256(bytes(it.name)), idByAddr, idByName);
        }
        uint256 id = idByName;
        Person storage p = _persons[id];

        p.cid  = it.cid;
        p.name = it.name;

        bool toggled = _handleActiveToggle(id, p, it.active);
        if (!toggled) {
            emit PersonUpdated(id, p.addr, p.nameKey, p.cid, (p.flags & FLAG_ACTIVE) != 0);
        }
    }

    /**
     * @notice 处理活跃状态切换（激活/停用）
     * @dev 返回是否发生了状态切换
     * @param id 记录 id
     * @param p 存储指针
     * @param newActive 目标活跃状态
     * @return toggled 是否发生切换
     */
    function _handleActiveToggle(uint256 id, Person storage p, bool newActive) internal returns (bool toggled) {
        bool currActive = (p.flags & FLAG_ACTIVE) != 0;
        if (newActive != currActive) {
            toggled = true;
            if (newActive) {
                p.flags |= FLAG_ACTIVE;
                _addActive(id);
                // 可选：emit PersonReactivated(id, p.addr, p.nameKey);
            } else {
                p.flags &= ~FLAG_ACTIVE;
                _removeActive(id);
                emit PersonDeactivated(id, p.addr, p.nameKey);
            }
        }
    }

    /**
     * @notice 批量停用
     * @param ids 需要停用的 id 列表
     */
    function batchDeactivate(uint256[] calldata ids) external onlyRole(OPERATOR_ROLE) {
        uint256 len = ids.length;
        for (uint256 i = 0; i < len; ) {
            uint256 id = ids[i];
            Person storage p = _persons[id];
            if (p.addr == address(0)) revert NotFound(id);
            if ((p.flags & FLAG_ACTIVE) != 0) {
                p.flags &= ~FLAG_ACTIVE;
                _removeActive(id);
                emit PersonDeactivated(id, p.addr, p.nameKey);
            }
            unchecked { ++i; }
        }
    }

    // ---------------------------------------------------------------------
    // Read APIs
    // ---------------------------------------------------------------------

    /// @notice 只读视图结构（包含 name 与 cid）
    struct PersonView {
        uint256 id;
        address addr;
        bytes32 nameKey;
        string  name;
        string  cid;
        bool    active;
    }

    /**
     * @notice 通过 id 获取记录
     * @param id 记录 id
     * @return v 视图结构
     */
    function getById(uint256 id) external view returns (PersonView memory v) {
        Person storage p = _persons[id];
        if (p.addr == address(0)) revert NotFound(id);
        v = _toView(id, p);
    }

    /**
     * @notice 通过名字（明文）获取记录
     * @dev 内部以 keccak256(bytes(name)) 计算 nameKey 并查索引
     * @param name 明文名字
     * @return v 视图结构
     */
    function getByName(string calldata name) external view returns (PersonView memory v) {
        bytes32 k = keccak256(bytes(name));
        uint256 id = idOfNameKey[k];
        if (id == 0) revert NotFoundByNameKey(k);
        v = _toView(id, _persons[id]);
    }

    /**
     * @notice 通过地址获取记录
     * @param addr 地址
     * @return v 视图结构
     */
    function getByAddress(address addr) external view returns (PersonView memory v) {
        uint256 id = idOfAddress[addr];
        if (id == 0) revert NotFoundByAddress(addr);
        v = _toView(id, _persons[id]);
    }

    /**
     * @notice 判断记录是否活跃
     * @param id 记录 id
     * @return 是否活跃
     */
    function isActive(uint256 id) external view returns (bool) {
        Person storage p = _persons[id];
        if (p.addr == address(0)) revert NotFound(id);
        return (p.flags & FLAG_ACTIVE) != 0;
    }

    /// @notice 当前活跃人数
    function totalActive() external view returns (uint256) { return _activeIds.length; }

    /// @notice 总记录数（含停用）
    function total() external view returns (uint256) { return _nextId - 1; }

    /**
     * @notice 仅返回活跃集合的 id 分页
     * @param offset 起始下标（0-based）
     * @param limit 返回条数上限
     * @return ids 一段活跃 id
     */
    function listActiveIds(uint256 offset, uint256 limit) external view returns (uint256[] memory ids) {
        uint256 n = _activeIds.length;
        if (offset >= n) return new uint256[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        uint256 sz = end - offset;
        ids = new uint256[](sz);
        for (uint256 i; i < sz; ) {
            ids[i] = _activeIds[offset + i];
            unchecked { ++i; }
        }
    }

    /**
     * @notice 活跃集合分页（返回完整 PersonView）
     * @param offset 起始下标（0-based）
     * @param limit 返回条数上限
     * @return out 视图数组
     */
    function getByPage(uint256 offset, uint256 limit) external view returns (PersonView[] memory out) {
        uint256 n = _activeIds.length;
        if (offset >= n) return new PersonView[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        uint256 sz = end - offset;
        out = new PersonView[](sz);
        for (uint256 i = 0; i < sz; ) {
            uint256 id = _activeIds[offset + i];
            out[i] = _toView(id, _persons[id]);
            unchecked { ++i; }
        }
    }

    /**
     * @notice 全量分页（活跃 + 非活跃）
     * @param offset 起始下标（0-based；注意 id 从 1 开始，因此取值要 +1）
     * @param limit 返回条数上限
     * @return out 视图数组
     */
    function getAllByPage(uint256 offset, uint256 limit) external view returns (PersonView[] memory out) {
        uint256 n = _nextId - 1;
        if (offset >= n) return new PersonView[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        uint256 sz = end - offset;
        out = new PersonView[](sz);
        for (uint256 i = 0; i < sz; ) {
            uint256 id = offset + i + 1; // ids: 1..n
            out[i] = _toView(id, _persons[id]);
            unchecked { ++i; }
        }
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    /// @dev 内部：将 storage Person 映射为只读视图
    function _toView(uint256 id, Person storage p) private view returns (PersonView memory v) {
        v.id      = id;
        v.addr    = p.addr;
        v.nameKey = p.nameKey;
        v.name    = p.name;
        v.cid     = p.cid;
        v.active  = (p.flags & FLAG_ACTIVE) != 0;
    }

    /// @dev 将 id 加入活跃集合（若尚未在集合中）
    function _addActive(uint256 id) private {
        if (_idIndexPlus1[id] == 0) {
            _activeIds.push(id);
            _idIndexPlus1[id] = _activeIds.length;
        }
    }

    /// @dev 从活跃集合中移除 id（swap-and-pop）
    function _removeActive(uint256 id) private {
        uint256 idx1 = _idIndexPlus1[id];
        if (idx1 == 0) return;
        uint256 idx = idx1 - 1;
        uint256 last = _activeIds[_activeIds.length - 1];
        if (idx != _activeIds.length - 1) {
            _activeIds[idx] = last;
            _idIndexPlus1[last] = idx + 1;
        }
        _activeIds.pop();
        _idIndexPlus1[id] = 0;
    }

    /**
     * @notice 合约版本号
     * @return 合约的版本字符串
     */
    function version() external pure returns (string memory) {
        return "CelebrityRegistryV1";
    }
}
