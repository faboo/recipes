import {LiveValue} from '../events.js'
import ContentWidget from './contentWidget.js'

export default class SelectPane extends ContentWidget{
	constructor(){
		super()

		this.addProperty('key', null)
		//this.key = new LiveValue(null)
	}

	async bind(context, root){
		await super.bind(context, root)

		this.parent.selectedProperty.addListener(this.onSelectedChanged.bind(this))
	}

	onSelectedChanged(){
		if(this.parent.selected == this.key)
			this.hidden = false
		else
			this.hidden = true
	}
}
