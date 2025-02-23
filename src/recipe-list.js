import {Widget} from './widgy/widgy.js'

export default class RecipeList extends Widget {
	constructor(){
		super()

		this.addEventSlot('newClicked')
		this.addEventSlot('editClicked')
		this.addEventSlot('viewClicked')
		this.addEventSlot('deleteClicked')
		this.addEventSlot('searchClicked')
		this.addEventSlot('clearClicked')
		this.addEventSlot('loginClicked')

		this.addProperty('recipes')

		this.addProperty('nameSearch')
		this.addProperty('ingredientSearch')
		this.addProperty('tagSearch')
	}

	onNewClicked(){
		this.triggerEvent('newClicked')
	}

	onEditClicked(event){
		this.triggerEvent('editClicked', event.data)
	}

	onViewClicked(event){
		this.triggerEvent('viewClicked', event.data)
	}

	onDeleteClicked(event){
		this.triggerEvent('deleteClicked', event.data)
	}

	onSearchClicked(event){
		this.triggerEvent('searchClicked', {name: this.nameSearch, ingredients: this.ingredientSearch, tags: this.tagSearch})
	}

	onClearClicked(event){
		this.triggerEvent('clearClicked')
	}

	onLoginClicked(){
		this.triggerEvent('loginClicked')
	}
}
