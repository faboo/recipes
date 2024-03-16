import Dialog from './dialog.js'

export default class OkDialog extends Dialog{
	constructor(){
		super()

		this.addProperty('title')
		this.addProperty('message')
		this.addProperty('button-text', 'OK')
	}

	okClicked(){
		this.close()
		this.setButtonClicked('ok')
	}
}

OkDialog.elementName = 'ok-dialog'
OkDialog.safeElementName = 'ok-dialog'
