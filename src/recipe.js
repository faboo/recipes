import {Model, LiveArray} from './widgy/widgy.js'
import {Ingredient} from './ingredient.js'
import {Instruction} from './instruction.js'

export class Recipe extends Model{
	constructor(template){
		super()

		this.addProperty('id', 0)
		this.addProperty('name', 'New Recipe')
		this.addProperty('image', '')
		this.addProperty('ingredients', new LiveArray())
		this.addProperty('instructions', new LiveArray())
		this.addProperty('tags', new LiveArray())

		if(template)
			this.loadFromTemplate(template)

		for(let idx in this.ingredients){
			this.ingredients.to(idx, new Ingredient(template.ingredients[idx]))
		}

		for(let idx in this.instructions){
			this.instructions.to(idx, new Instruction(template.instructions[idx]))
		}
	}
}
