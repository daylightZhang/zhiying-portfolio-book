import { CURRENCIES, CURRENCY_SYMBOLS } from '../../utils/constants'
import CustomSelect from '../common/CustomSelect'

const CURRENCY_OPTIONS = CURRENCIES.map(c => ({
  value: c,
  label: `${CURRENCY_SYMBOLS[c]} ${c}`,
}))

interface Props {
  value: string
  onChange: (currency: string) => void
}

export default function CurrencySelector({ value, onChange }: Props) {
  return (
    <CustomSelect
      options={CURRENCY_OPTIONS}
      value={value}
      onChange={onChange}
      className="w-28"
    />
  )
}
