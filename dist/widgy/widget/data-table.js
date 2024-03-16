import {LiveValue} from '../events.js'
import {Widget} from '../widget.js'
import {Widgy} from '../base.js'

export default class DataTable extends Widget{
	#onItemsChanged
	#onItemsContentChanged
	#adjustBoundItems
	#resetSize
	#template
	#table
	#rows
	#context
	#scrolling
	#resizing

	constructor(){
		super()

		this.#scrolling = false
		this.#resizing = false

		this.#onItemsChanged = this.onItemsChanged.bind(this)
		this.#onItemsContentChanged = this.onItemsContentChanged.bind(this)
		this.#adjustBoundItems = this.adjustBoundItems.bind(this)
		this.#resetSize = this.resetSize.bind(this)

		this.addProperty('items', null, this.#onItemsChanged)
		this.addProperty('offset', 0)

		this.rowHeight = null
		this.headings = []
		this.widths = []
	}

	getTemplate(root){
		let columns = root.querySelectorAll('column')
		let template = document.createElement('tr')
		let fillCell = []
		let fillIndex = []
		let totalWidth = 0
		let fillWidth = 0
		
		for(let columnIdx = 0; columnIdx < columns.length; columnIdx += 1){
			let column = columns[columnIdx]
			let cell = document.createElement('td')
			let heading = column.getAttribute('heading')
			let width = column.getAttribute('width') || '*'

			cell.innerHTML = column.innerHTML
			template.appendChild(cell)
			this.headings.push(heading)
			this.widths.push(width)

			if(width == '*'){
				fillCell.push(cell)
				fillIndex.push(columnIdx)
			}
			else{
				totalWidth += parseInt(width, 10)
			}
		}

		if(fillCell.length){
			fillWidth = Math.max((100 - totalWidth) / fillCell.length, 0)

			for(let index in fillCell){
				this.widths[fillIndex[index]] = fillWidth
			}
		}

		return template
	}

	async bind(context, root){
		this.#context = context
		this.#template = this.getTemplate(root)

		await super.bind(context, root)

		this.#table = this.root.children[0]

		this.root.addEventListener('scroll', this.onScroll.bind(this))
		window.addEventListener('resize', this.onResize.bind(this))

		this.updateItems()
	}

	async measureRow(){
		let item = this.items[0]
		let row = await this.createRowElement()
		let rect
		
		this.bindRowElement(row, item, 0)

		//this.#rows.appendChild(row)

		this.insertRow(row)

		rect = row.getBoundingClientRect()

		this.rowHeight = rect.height
	}

	async createRowElement(){
		let row = this.#template.cloneNode(true)
		let context = new Widgy()

		context.addProperty('context', this.#context)
		context.addProperty('item', null)
		context.addProperty('index', null)

		row.widget = this
		row.context = context

		await this.populateChildren(context, row, null)

		for(let index in this.widths){
			let width = this.widths[index]
			row.children[index].setAttribute('style', `width: ${width}%`)
		}

		return row
	}

	bindRowElement(row, value, index){
		let top = index * (this.rowHeight || 0)

		row.context.item = value
		row.context.index = index + 1

		row.liveValue = value

		row.setAttribute('style', `top: ${top}px`)
	}

	hasSpecialWidget(element){
		let name = element.nodeName.toLowerCase()
		return name == 'tbody' || name == 'thead'
	}

	getTbodyWidget(){
		this.#rows = document.createElement('tbody')

		return this.#rows
	}

	getTheadWidget(){
		let head = document.createElement('thead')
		let row = document.createElement('tr')

		for(let index in this.headings){
			let heading = this.headings[index]
			let width = this.widths[index]
			let cell = document.createElement('th')

			if(heading)
				cell.textContent = heading
			else
				cell.innerHTML = '&nbsp;'
			cell.setAttribute('style', `width: ${width}%`)

			row.appendChild(cell)
		}

		head.appendChild(row)

		return head
	}

	getSpecialWidget(element){
		if(element.nodeName.toLowerCase() == 'tbody')
			return this.getTbodyWidget()
		else
			return this.getTheadWidget()
	}

	async updateItems(){
		let bodyHeight
		let tableHeight = this.root.getBoundingClientRect().height

		this.#rows.innerHTML = ''
		this.root.scrollTo(0, 0)

		// Make sure we know how big a row is
		if(this.items.length && this.rowHeight === null){
			await this.measureRow()
		}

		// Set the scrollable area to match how many items we have (virtual
		// rows)
		bodyHeight = this.rowHeight * this.items.length
		this.#rows.setAttribute('style', `height: ${bodyHeight}px`)

		await this.adjustBoundItems()
	}

	onScroll(event){
		if(!this.#scrolling){
			this.#scrolling = true
			window.requestAnimationFrame(this.#adjustBoundItems)
		}
	}

	onResize(event){
		if(!this.#resizing){
			this.#resizing = true
			window.requestAnimationFrame(this.#resetSize)
		}
	}

	resetSize(){
		this.rowHeight = null
		this.#resizing = false
		this.#rows.innerHTML = ''

		this.updateItems()
	}

	insertRow(row){
		let beforeRow = null

		for(let candidate of this.#rows.childNodes){
			if(row.context.index == candidate.context.index){
				console.log('Row already exists: ')
				console.log(row)
			}

			if(row.context.index < candidate.context.index){
				beforeRow = candidate
				break
			}
		}
		
		if(beforeRow)
			this.#rows.insertBefore(row, beforeRow)
		else
			this.#rows.appendChild(row)
	}

	async adjustBoundItems(){
		let tableHeight = this.root.getBoundingClientRect().height
		let priorFirstIndex = 0
		let firstIndex = Math.max(0, Math.floor(this.root.scrollTop / this.rowHeight) - 2)
		let lastIndex = Math.min(
			this.items.length - 1,
			Math.floor((this.root.scrollTop + tableHeight) / this.rowHeight) + 2)
		let freeRows = []
		let assignedIndexes = {}

		this.#scrolling = false
		this.offset = this.root.scrollTop

		// Free up bindable rows that aren't visible
		for(let row of this.#rows.children){
			let index = row.context.index - 1

			if(priorFirstIndex === 0)
				priorFirstIndex = index

			if(index < firstIndex || index > lastIndex){
				freeRows.push(row)
			}
			else{
				assignedIndexes[index] = true

				// Update this item if it changed
				if(row.context.item !== this.items.at(index))
					this.bindRowElement(row, this.items.at(index), index)
			}
		}

		// Only rebind rows if we're starting from the first element, or if
		// we've scrolled an even number of rows. This keeps CSS's nth() feature
		// working correctly.
		if(firstIndex === 0 || !((priorFirstIndex - firstIndex) % 2)){
			// Remove extra rows
			for(let freeRow of freeRows)
				freeRow.remove()

			// Bind newly visible items.
			for(let index = firstIndex, position = 0; index <= lastIndex; ++index, ++position){
				if(!(index in assignedIndexes)){
					let row = freeRows.length? freeRows.pop() : await this.createRowElement()

					this.bindRowElement(row, this.items.at(index), index)

					this.insertRow(row)
				}
			}
		}
	}

	onItemsChanged(event){
		if(event.oldValue)
			event.oldValue.removeEventListener('setvalue', this.#onItemsContentChanged)

		if(this.bound){
			this.#rows.innerHTML = ''
			this.resetSize()
			this.updateItems()
		}

		this.items.addEventListener('setvalue', this.#onItemsContentChanged)
	}

	onItemsContentChanged(){
		if(this.bound)
			this.updateItems()
	}
}
