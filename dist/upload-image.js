import {Widget} from './widgy/widgy.js'

export default class UploadImage extends Widget {
	#input
	#image

	constructor(){
		super()

		this.addProperty('imageObject', '', this.onImageObjectChanged.bind(this))
		this.addProperty('imageUrl', '', this.onImageObjectChanged.bind(this))
		this.addProperty('image', '', this.onImageChanged.bind(this))
		this.addProperty('hideClear', true)
		this.addProperty('cleared', false)
	}

	async bind(context, root){
		await super.bind(context, root)

		this.#input = this.firstElement('input')
		this.#image = this.firstElement('#upload-image-local')

		this.#input.addEventListener('input', this.onInputChange.bind(this))
		this.#image.addEventListener('click', this.onImageClick.bind(this))
	}

	onImageClick(event){
		event.preventDefault()
		this.#input.click()
	}

	onInputChange(event){
		let input = event.currentTarget

		event.preventDefault()

		for(let file of input.files){
			this.imageObject = URL.createObjectURL(file)
		}
	}

	onClearClicked(){
		this.imageObject = ''
		this.cleared = true
	}

	async onImageObjectChanged(){
		if(this.imageObject){
			let blob = await fetch(this.imageObject).then(rsp => rsp.blob())
			let reader = new FileReader()
			let promiseResolve
			let promise = new Promise(res => { promiseResolve = res })
			let image

			reader.addEventListener('load', promiseResolve)
			reader.readAsDataURL(blob)
			await promise

			image = reader.result.replace(/^[^,]*,/, '')

			this.hideClear = false

			if(image != this.image)
				this.image = image
		}
		else{
			this.image = ''
			this.hideClear = true
		}
	}

	async onImageChanged(){
		if(this.image){
			let resp = await fetch('data:image/*;base64,'+this.image)
			let blob = await resp.blob()

			this.imageObject = URL.createObjectURL(blob)
		}
		else{
			this.imageObject = ''
		}
	}
}

