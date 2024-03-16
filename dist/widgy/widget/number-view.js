import {Widget} from '../widget.js'

export default class NumberInput extends Widget{
	constructor(){
		super()

		this.addProperty('view', '0')
		this.addProperty('format', ',.2', this.onFormatChanged)
		this.addProperty('number', 0, this.onNumberChanged)
	}

	readFormatNumber(formatStr){
		const zero = '0'.charCodeAt(0)
		let number = 0

		while(formatStr.length && formatStr[0] >= '0' && formatStr[0] <= '9'){
			number *= 10
			number += formatStr.charCodeAt(0) - zero
			formatStr = formatStr.slice(1)
		}

		return [formatStr, number]
	}

	formatNumber(formatStr, number){
		let wholeNumber = Math.abs(Math.floor(number))
		let decimalNumber = Math.abs(number) - wholeNumber
		let positive = false
		let commas = false
		let fill = 0
		let minDecimals = 0
		let maxDecimals = -1
		let sign = ''
		let whole = ''
		let decimal = ''
		let string = ''

		if(formatStr.length && formatStr[0] == '+'){
			positive = true
			formatStr = formatStr.slice(1)
		}

		if(formatStr.length && formatStr[0] == ','){
			commas = true
			formatStr = formatStr.slice(1)
		}
		
		[formatStr, fill] = this.readFormatNumber(formatStr)

		if(formatStr.length && formatStr[0] == '.'){
			formatStr = formatStr.slice(1);

			[formatStr, minDecimals] = this.readFormatNumber(formatStr)

			if(formatStr.length && formatStr[0] == ','){
				formatStr = formatStr.slice(1)

				[formatStr, maxDecimals] = this.readFormatNumber(formatStr)

				if(maxDecimals == 0)
					maxDecimals = -1
			}
			else{
				maxDecimals = minDecimals
			}
		}

		if(number < 0)
			sign += '-'
		else if(number > 0 && positive)
			sign += '+'

		if(commas)
			whole = wholeNumber.toLocaleString()
		else
			whole = wholeNumber.toString(10)

		if(maxDecimals != 0){
			decimal = decimalNumber.toString().slice(1)

			if(maxDecimals > 0)
				decimal = decimal.slice(0, maxDecimals+1)

			if(minDecimals > 0 && minDecimals > decimal.length){
				decimal += '0'.repeat(minDecimals - decimal.length)

				if(decimal[0] !== '.')
					decimal = '.' + decimal
			}
		}

		string = whole + decimal

		if(string.length < fill)
			string = '0'.repeat(fill - string.length) + string

		return sign + string
	}

	onFormatChanged(){
		this.view = this.formatNumber(this.format, this.number)
	}

	onNumberChanged(){
		this.view = this.formatNumber(this.format, this.number)
	}
}

