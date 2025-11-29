/**
 * 格式化金额显示
 * 规则：
 * 1. 最多保留10位小数
 * 2. 自动移除末尾的0
 * 3. 分离整数和小数部分以便差异化显示
 */
export function formatAmount(rawAmount: string | number) {
  // 1. 转为数字并限制10位小数
  const number = parseFloat(String(rawAmount));

  // 如果是无效数字，返回 0
  if (isNaN(number)) {
    return {
      integerPart: '0',
      decimalPart: '',
      hasDecimal: false,
      fullAmount: '0'
    };
  }

  // 2. 限制最多10位小数
  const formattedNumber = parseFloat(number.toFixed(10));

  // 3. 转为字符串（自动去除末尾0）
  const str = formattedNumber.toString();

  // 4. 分离整数和小数部分
  const parts = str.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '';

  return {
    integerPart, // 如: "123"
    decimalPart, // 如: "4567" (已去除末尾0)
    hasDecimal: !!decimalPart,
    fullAmount: str // 完整字符串，如: "123.4567"
  };
}

/**
 * 渲染格式化的金额 - 用于 React 组件
 * 整数部分正常字体，小数部分缩小字体
 */
export function FormattedAmount({
  amount,
  symbol,
  className = '',
  integerClassName = '',
  decimalClassName = '',
  symbolClassName = ''
}: {
  amount: string | number;
  symbol?: string;
  className?: string;
  integerClassName?: string;
  decimalClassName?: string;
  symbolClassName?: string;
}) {
  const { integerPart, decimalPart, hasDecimal } = formatAmount(amount);

  return (
    <div className={`flex items-baseline gap-0 ${className}`}>
      {/* 整数部分 */}
      <span className={integerClassName}>{integerPart}</span>

      {/* 小数点和小数部分 */}
      {hasDecimal && <span className={decimalClassName}>.{decimalPart}</span>}

      {/* 代币符号 */}
      {symbol && <span className={`ml-1 ${symbolClassName}`}>{symbol}</span>}
    </div>
  );
}
