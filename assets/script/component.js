export class PlainComponent {

	constructor(element, classes) {

		this.element = element;

		classes = classes || [];

		for(let class_name of classes) {

			let prop_name = class_name.replace("-", "_");

			let value = null;
			let setter = (new_value) => {
				if(value === new_value) {
					return;
				}
				value = new_value;
				if(new_value) {
					this.element.classList.add(class_name);
				} else {
					this.element.classList.remove(class_name);
				}
			};
			Object.defineProperty(this, prop_name, { set: setter });
		}
	}

	get dataset() {
		return this.element.dataset;
	}

	on(event_name, fn) {
		let c = this;
		this.element.addEventListener(event_name, (ev) => fn(ev, c));
	}
}

export class TextComponent extends PlainComponent {

	constructor(element, classes) {
		super(element, classes);
		this._text = null;
	}

	get text() {
		return this._text;
	}

	set text(value) {
		if(value !== this._text) {
			this._text = value;
			this.element.textContent = value;
		}
	}
}

export class LinkComponent extends PlainComponent {

	constructor(element, classes) {
		super(element, classes);
		this._href = null;
	}

	get href() {
		return this._href;
	}

	set href(value) {
		if(value !== this._href) {
			this._href = value;
			this.element.href = value;
		}
	}
}

export class ImageComponent extends PlainComponent {

	constructor(element, classes) {

		super(element, classes);

		this._image_active = null;
		this._image_src = null;
		this._actual_src = null;
	}

	_update_element_src() {
		let completed = (this._actual_src === this._image_src && this.element.complete);
		let enabled = (this._image_active || completed);
		let src = enabled ? this._image_src : null;
		if(this._actual_src !== src) {
			this._actual_src = src;
			if(src === null) {
				this.element.src = "";
			} else {
				this.element.src = "";
				this.element.src = src;
			}
		}
	}

	set src(value) {
		if(this._image_src === value) {
			return;
		}
		this._image_src = value;
		this._update_element_src();
	}

	set active(value) {
		if(this._image_active === value) {
			return;
		}
		this._image_active = value;
		this._update_element_src();
	}

	get complete() {
		return this.element.complete;
	}
}

export class ComponentList extends PlainComponent {

	constructor(element, classes, ctor) {

		super(element, classes);

		this._list_ctor = ctor;
		let template = element.querySelector(":scope > template");
		this._list_template = element.removeChild(template).content.firstElementChild;

		this._list_components = [];
		this._list_unused_components = [];
	}

	resize(value) {

		let length = this._list_components.length;
		let added_count = value - length;
		let removed_count = length - value;

		for(let i = 0; i < added_count; i += 1) {
			let index = length + i;
			let comp = this._list_unused_components.pop();
			if(comp === undefined) {
				let elem = this._list_template.cloneNode(true);
				comp = this._list_ctor(elem);
			}
			comp.element.dataset.listIndex = index.toString();
			this.element.appendChild(comp.element);
			this._list_components.push(comp);
		}

		for(let i = 0; i < removed_count; i += 1) {
			let comp = this._list_components.pop();
			this.element.removeChild(comp.element);
			this._list_unused_components.push(comp);
		}
	}

	rotate_items(front_to_back) {
		if(front_to_back) {
			let item = this._list_components.shift();
			this._list_components.push(item);
			this.element.removeChild(item.element);
			this.element.appendChild(item.element);
		} else {
			let item = this._list_components.pop();
			this._list_components.unshift(item);
			this.element.removeChild(item.element);
			this.element.insertBefore(item.element, this.element.firstElementChild);
		}
		for(let i = 0; i < this._list_components.length; i += 1) {
			this._list_components[i].element.dataset.listIndex = i.toString();
		}
	}

	find_index(item_element) {
		let index = parseInt(item_element.dataset.listIndex);
		return index;
	}

	get items() {
		return this._list_components;
	}
}

export class ComponentContainer extends PlainComponent {

	constructor(element, classes, children) {

		super(element, classes);

		for(let [name, comp] of Object.entries(children)) {
			this[name] = comp;
		}
	}
}

function build_component_with_root_element(mapping, root_element) {

	let element = mapping.element || root_element.querySelector(mapping.query);
	if(element === undefined || element === null) {
		console.error(`undefined element (${mapping.element}, ${mapping.query})`);
	}
	let classes = mapping.classes;
	let component = null;

	if(mapping.children !== undefined) {

		let ch_comps = {};
		for(let [name, m] of Object.entries(mapping.children)) {
			ch_comps[name] = build_component_with_root_element(m, element);
		}
		component = new ComponentContainer(element, classes, ch_comps);

	} else if(mapping.items !== undefined) {

		let ctor = (item_elem) => {
			let m = {
				element: item_elem,
				classes: mapping.item_classes,
				handlers: mapping.item_handlers,
				children: mapping.items,
			};
			return build_component_with_root_element(m, item_elem);
		}

		component = new ComponentList(element, classes, ctor);

	} else {

		if(element.tagName === "IMG") {
			component = new ImageComponent(element, classes);
		} else if(element.tagName == "A") {
			component = new LinkComponent(element, classes);
		} else if(element.childElementCount == 0) {
			component = new TextComponent(element, classes);
		} else {
			component = new PlainComponent(element, classes);
		}
	}

	if(component === null) {
		return null;
	}

	for(let [ev, fn] of Object.entries(mapping.handlers || {})) {
		component.on(ev, fn);
	}

	return component;
}

export function build_component(mapping) {
	return build_component_with_root_element(mapping, document);
}
