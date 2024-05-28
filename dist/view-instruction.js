import {Widget} from './widgy/widgy.js'

export default class ViewInstruction extends Widget {
	constructor(){
		super()

		this.addProperty('recipe', null)
		this.addProperty('instruction', '', this.onInstructionChanged)
		this.addProperty('index', 0, this.onInstructionChanged)
		this.addProperty('instructionHtml', '')
	}

	wrapIngredient(ingredient){
		return '<span class="amount">'+ingredient.amount.toString()+' '+ingredient.unit+'</span> '+name
	}

	getIngredient(name){
		let text = null

		name = name.toLowerCase()

		// Starts with
		for(let ingredient of this.recipe.ingredients.values())
			if(ingredient.what.toLowerCase().startsWith(name)){
				text = this.wrapIngredient(ingredient)
				break
			}

		// ... or contained in
		if(text == null)
			for(let ingredient of this.recipe.ingredients.values())
				if(ingredient.what.toLowerCase().indexOf(name) >= 0){
					text = this.wrapIngredient(ingredient)
					break
				}

		// ... okay, just use the original text
		if(text == null){
			text = name
		}

		return text
	}

	onInstructionChanged(){
		let newChars = []
		let escaped = false
		let name = null

		for(let chr of this.instruction.text){
			if(name !== null)
				if(chr === '}'){
					newChars.push(this.getIngredient(name))
					name = null
				}
				else{
					name += chr
				}
			else if(escaped)
				newChars.push(chr)
			else if(chr === '\\')
				escaped = true
			else if(chr === '{')
				name = ''
			else
				newChars.push(chr)
		}

		this.instructionHtml = '<p><span class="enumeral">'+String(this.index)+'</span>'
		this.instructionHtml += newChars.join('').replace('\n', '</p><p>')+'</p>'
	}
}

