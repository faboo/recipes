import {Widget} from './widgy/widgy.js'
import {LiveArray} from './widgy/widgy.js'
import {Recipe} from './recipe.js'
import {Ingredient} from './ingredient.js'
import {Instruction} from './instruction.js'

export default class EditRecipe extends Widget {
	constructor(){
		super()

		this.dropContainer = true

		this.addEventSlot('saveClicked')
		this.addEventSlot('cancelClicked')

		this.addProperty('recipe', null, this.onRecipeChanged)
		this.addProperty('editRecipe')
		this.addProperty('tags', '')
	}

	onSaveClicked(){
		let tags = Array.from(new Set(this.tags.split(/[ ,;]+/)))
		this.editRecipe.tags = new LiveArray(tags)
		this.triggerEvent('saveClicked', this.editRecipe)
	}

	onCancelClicked(){
		this.triggerEvent('cancelClicked')
	}

	onRecipeChanged(){
		this.editRecipe = new Recipe(this.recipe)
		this.tags = (this.editRecipe.tags || []).join(' ')
	}

	onAddIngredient(){
		this.editRecipe.ingredients.push(new Ingredient())
	}

	onRemoveIngredient(event){
		this.editRecipe.ingredients.splice(event.data.index - 1, 1)
	}

	onDrop(event, data, type){
		let moveIndex = data - 1
		let destIndex = event.currentTarget.widget.index - 1
		let moveIngredient = this.editRecipe.ingredients[moveIndex]

		this.editRecipe.ingredients.splice(moveIndex, 1)
		this.editRecipe.ingredients.splice(destIndex, 0, moveIngredient)
	}

	onMoveIngredientUp(event){
		let index = event.data.index - 1
		if(index > 0){
			let otherObject = this.editRecipe.ingredients.at(index - 1)

			this.editRecipe.ingredients.to(
				index - 1, 
				this.editRecipe.ingredients.at(index))
			this.editRecipe.ingredients.to(
				index,
				otherObject)
		}
	}

	onMoveIngredientDown(event){
		let index = event.data.index - 1
		if(index < this.editRecipe.ingredients.length - 1){
			let otherObject = this.editRecipe.ingredients.at(index + 1)

			this.editRecipe.ingredients.to(
				index + 1, 
				this.editRecipe.ingredients.at(index))
			this.editRecipe.ingredients.to(
				index,
				otherObject)
		}
	}

	onAddInstruction(){
		this.editRecipe.instructions.push(new Instruction())
	}

	onRemoveInstruction(event){
		this.editRecipe.instructions.splice(event.data.index - 1, 1)
	}
}
