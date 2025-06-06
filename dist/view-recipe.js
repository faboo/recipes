import {Widget} from './widgy/widgy.js'
import {Recipe} from './recipe.js'
import {Ingredient} from './ingredient.js'
import {Instruction} from './instruction.js'

export default class ViewRecipe extends Widget {
	constructor(){
		super()

		this.addEventSlot('closeClicked')
		this.addEventSlot('copyClicked')

		this.addProperty('recipe', null)
	}

	onCloseClicked(){
		this.triggerEvent('closeClicked')
	}

	onPrintClicked(){
		window.print()
	}

	onShareClicked(){
		/*
		this.application.busy = true

		let recipe = this.recipe.toPOJO()
		let recipeJson
		let shareUrl

		delete recipe.image
		recipeJson = JSON.stringify(recipe)
		shareUrl = new URL(location)

		// This should work but doesn't
		//shareUrl.hash = "#view/recipeJSON="+encodeURIComponent(recipeJson)
		shareUrl.hash = ''
		shareUrl = String(shareUrl)+'#view/recipeJSON='+encodeURIComponent(recipeJson)

		navigator.clipboard.writeText(shareUrl)

		this.application.busy = false
		*/
		if(window.currentApplication.identity)
			navigator.clipboard.writeText(
				location.origin+'/#view/recipeId='
				+this.recipe.id
				+'&chef='+window.currentApplication.identity.email)
	}

	onCopyClicked(){
		this.triggerEvent('copyClicked', this.recipe)
	}
}
