import {Widget} from './widgy/widgy.js'

export default class EditInstruction extends Widget {
	constructor(){
		super()

		this.addEventSlot('removeClicked')

		this.addProperty('instruction')
		this.addProperty('index')
	}

	onRemoveClicked(){
		this.triggerEvent('removeClicked', {instruction: this.instruction, index: this.index})
	}
}

