import {Model, LiveArray} from './widgy/widgy.js'
import Fraction from './fraction.js'

export class Ingredient extends Model{

	constructor(template){
		super()

		this.addProperty('amount', new Fraction())
		this.addProperty('unit', 'cup')
		this.addProperty('what', '')

		if(template){
			this.loadFromTemplate(template)
			this.amount = new Fraction(this.amount)
		}
	}
}

