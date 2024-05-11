import {Widget} from './widgy/widgy.js'

export default class RawImage extends Widget {
	constructor(){
		super()

		this.addProperty('base64', '', this.onBase64Change.bind(this))
		this.addProperty('src', '', this.onSrcChange.bind(this))
	}

	onBase64Change(){
		if(this.base64)
			if(RegExp('^https:\/\/').test(this.base64))
				this.src = this.base64
			else
				this.src = 'data:image/*;base64,'+this.base64
		else
			this.src = ''
	}

	onSrcChange(){
		this.root.src = this.src
	}

	createRoot(){
		return document.createElement('img')
	}

	bind(root, context){
		super.bind(root, context)

		this.root.src = this.src
	}
}
