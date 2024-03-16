import {Widget} from './widgy/widgy.js'
import Fraction from './fraction.js'

export default class FractionInput extends Widget{
	constructor(){
		super()

		this.addProperty('fraction', new Fraction(), this.onFractionChanged)
		this.addProperty('fractional', this.fraction.fractionalString())
	}

	onUpClicked(){
		if(this.fraction.fractional < (Fraction.FRACTIONS.length - 1)){
			this.fraction.fractional += 1
			this.fractional = this.fraction.fractionalString()
		}
	}
	onDownClicked(){
		if(this.fraction.fractional > 0){
			this.fraction.fractional -= 1
			this.fractional = this.fraction.fractionalString()
		}
	}

	onFractionChanged(){
		this.fractional = this.fraction.fractionalString()
	}
}
