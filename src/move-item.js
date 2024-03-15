import {Widget} from './widgy/widgy.js'

export default class MoveItem extends Widget{
	constructor(){
		super()

		this.addEventSlot('up')
		this.addEventSlot('down')
	}

	onUpClicked(){
		this.triggerEvent('up')
	}

	onDownClicked(){
		this.triggerEvent('down')
	}
}

