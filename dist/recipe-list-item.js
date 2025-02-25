import {Widget} from './widgy/widgy.js'
import * as dialog from './widgy/dialog.js'

export default class RecipeListItem extends Widget {
	constructor(){
		super()

		this.addEventSlot('editClicked')
		this.addEventSlot('viewClicked')
		this.addEventSlot('deleteClicked')

		this.addProperty('recipe', null, this.onRecipeChanged)
		this.addProperty('imgurl', 'default_image.png')

		this.onRecipeContentChanged = this.onRecipeContentChanged.bind(this)
	}

	onRecipeChanged(event){
		if(event.oldValue){
			event.oldValue.imageProperty.removeEventListener(this.onRecipeContentChanged)
			event.oldValue.imageUrlProperty.removeEventListener(this.onRecipeContentChanged)
		}
		
		this.onRecipeContentChanged()

		if(this.recipe){
			this.recipe.imageProperty.addEventListener('setvalue', this.onRecipeContentChanged)
			this.recipe.imageUrlProperty.addEventListener('setvalue', this.onRecipeContentChanged)
		}
	}

	onRecipeContentChanged(){
		this.imgurl = 'default_image.png'

		if(this.recipe)
			if(this.recipe.imageUrl)
				this.imgurl = this.recipe.imageUrl
			else if(this.recipe.image)
				this.imgurl = 'data:image/*;base64,'+this.recipe.image
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

