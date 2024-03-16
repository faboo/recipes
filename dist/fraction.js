import {Model} from './widgy/widgy.js'

export default class Fraction extends Model{
	static FRACTIONS = [' ', '¼', '⅓', '½', '⅔']

	constructor(template){
		super()

		this.addProperty('whole', 1)
		this.addProperty('fractional', 0)

		if(template)
			this.loadFromTemplate(template)
	}

	toString(){
		let text = Fraction.FRACTIONS[this.fractional]

		if(this.whole != 0){
			text = String(this.whole) + Fraction.FRACTIONS[this.fractional]

		}

		return text
	}

	fractionalString(){
		return Fraction.FRACTIONS[this.fractional]
	}
}
