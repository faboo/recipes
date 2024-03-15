import {Widget} from './widgy/widgy.js'
import * as dialog from './widgy/dialog.js'

export default class RecipeListItem extends Widget {
	constructor(){
		super()

		this.addEventSlot('editClicked')
		this.addEventSlot('viewClicked')
		this.addEventSlot('deleteClicked')

		this.addProperty('recipe', null, this.onRecipeChanged)
	}

	onEditClicked(){
		this.triggerEvent('editClicked', this.recipe)
	}

	onViewClicked(){
		this.triggerEvent('viewClicked', this.recipe)
	}

	deleteRecipe(){
		this.triggerEvent('deleteClicked', this.recipe)
	}

	async onDeleteClicked(){
		let okCancel = await this.application.openDialog(
			dialog.OkCancelDialog,
			{ title: 'Delete Recipe'
			, message: `Really delete recipe ${this.recipe.name}?`
			, 'ok-text': 'Yes'
			, 'cancel-text': 'No'
			, onOk: 'deleteRecipe'
			},
			this)
		let buttonClicked = await okCancel.getButtonClicked()
		
		if(buttonClicked == 'ok')
			this.deleteRecipe()
	}
}

