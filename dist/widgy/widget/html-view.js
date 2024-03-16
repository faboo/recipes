import {Widget} from '../widget.js'

export default class HtmlView extends Widget{
	constructor(){
		super()

		this.addProperty('html', '', this.onHtmlChanged)
	}

	async bind(context, root){
		await super.bind(context, root)

		this.root.innerHTML = this.html
	}

	onHtmlChanged(){
		if(this.bound)
			this.root.innerHTML = this.html
	}
}



