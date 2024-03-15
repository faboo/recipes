import {Widget} from './widgy/widgy.js'

export default class EditIngredient extends Widget {
	constructor(){
		super()

		this.addEventSlot('removeClicked')
		this.addEventSlot('moveUp')
		this.addEventSlot('moveDown')

		this.addProperty('ingredient')
		this.addProperty('index')

		this.dragtarget = true

		this.dropoverProperty.addListener(this.onDropoverChanged.bind(this))
	}

	onRemoveClicked(){
		this.triggerEvent('removeClicked', {ingredient: this.ingredient, index: this.index})
	}

	onUp(){
		this.triggerEvent('moveUp', {ingredient: this.ingredient, index: this.index})
	}

	onDown(){
		this.triggerEvent('moveDown', {ingredient: this.ingredient, index: this.index})
	}

	onDropoverChanged(){
		if(this.dropover)
			this.class += ' dropover'
		else
			this.class = this.class.replace(/\s+dropover/, '')
	}
}
