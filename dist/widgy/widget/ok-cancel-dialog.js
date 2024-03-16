import Dialog from './dialog.js'

export default class OkCancelDialog extends Dialog{
	constructor(){
		super()

		this.addProperty('title')
		this.addProperty('message')
		this.addProperty('ok-text', 'OK')
		this.addProperty('cancel-text', 'Cancel')

		this.addEventSlot('onOk')
		this.addEventSlot('onCancel')
	}

	okClicked(){
		this.triggerEvent('onOk')
		this.close()
		this.setButtonClicked('ok')
	}

	cancelClicked(){
		this.triggerEvent('onCancel')
		this.close()
		this.setButtonClicked('cancel')
	}
}

OkCancelDialog.elementName = 'ok-cancel-dialog'
OkCancelDialog.safeElementName = 'ok-cancel-dialog'
