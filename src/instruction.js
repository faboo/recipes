import {Model} from './widgy/widgy.js'

export class Instruction extends Model{

	constructor(template){
		super()

		this.addProperty('text', '')
		this.addProperty('optional', false)

		if(template){
			this.loadFromTemplate(template)
		}
	}
}


