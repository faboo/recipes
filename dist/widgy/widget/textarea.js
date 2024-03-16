import {Widget} from '../widget.js'

export default class TextArea extends Widget{
	#input

	constructor(){
		super()

		this.addAttributeSlot('value', 'textarea', '', 'input')
		this.addAttributeSlot('placeholder', 'textarea', '', 'input')

		this.addProperty('text', '')
		this.addProperty('placeholder', '')
	}
}


