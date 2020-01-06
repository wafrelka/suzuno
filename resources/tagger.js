class TaggerComponent {

	constructor(root, dialog_box, bookmark_list) {

		this._root = root;
		this._dialog_box = dialog_box;
		this._bookmark_list = bookmark_list;

		this._setup_tag_buttons();
	}

	_setup_tag_buttons() {

		let item_template = this._root.querySelector(".tagger-item.template");
		let button_template = this._root.querySelector(".tagger-dialog-button.template");
		let tags = this._bookmark_list.tags().sort((a, b) => a.name.localeCompare(b.name));

		for(let tag of tags) {

			if(tag.main !== true) {
				continue;
			}

			let v = item_template.cloneNode(true);
			v.classList.remove("template");
			v.dataset.tag = tag.id;

			v.addEventListener("click", (ev) => {

				let target = ev.currentTarget;
				let tag = target.dataset.tag;
				let path = this._root.dataset.path;

				if(path === undefined || path === "") {
					return;
				}

				console.log("tagging", path, tag, !target.classList.contains("tagged"));

				if(target.classList.contains("tagged")) {
					this._bookmark_list.unset_tag(path, tag);
					target.classList.remove("tagged");
				} else {
					this._bookmark_list.set_tag(path, tag, Date.now());
					target.classList.add("tagged");
				}
			});

			this._root.appendChild(v);
		}

		let b = button_template.cloneNode(true);
		b.classList.remove("template");

		b.addEventListener("click", (ev) => {

			let path = this._root.dataset.path;

			if(path === undefined || path === "") {
				return;
			}

			this._dialog_box.activate(path);
		});

		this._root.appendChild(b);
	}

	redraw() {

		let path = this._root.dataset.path;
		let cur_tags = [];
		if(path !== undefined && path !== "") {
			cur_tags = this._bookmark_list.get_tags(path);
		}

		for(let tag_elem of this._root.querySelectorAll(".tagger-item")) {
			let tag = tag_elem.dataset.tag;
			if(tag === undefined) {
				continue;
			}
			if(cur_tags.includes(tag)) {
				tag_elem.classList.add("tagged");
			} else {
				tag_elem.classList.remove("tagged");
			}
		}
	}
}

class TaggerDialogBox {

	constructor(root) {

		this._root = root;
		this._path = null;

		this._root.addEventListener("click", (ev) => {
			if(this._root.querySelector(".tagger-content").contains(ev.target)) {
				return;
			}
			this._root.classList.remove("active");
		})
	}

	activate(path) {

		this._path = path;
		this._root.classList.add("active");
		this._root.classList.add("interacted");

		this._root.querySelector(".dialog-path").textContent = path;
	}
}

class Tagger {

	constructor(roots, dialog_box_elem, bookmark_list) {
		this._dialog_box = new TaggerDialogBox(dialog_box_elem);
		this._comps = Array.from(roots, (r) => new TaggerComponent(r, this._dialog_box, bookmark_list));
		this._bookmark_list = bookmark_list;
	}

	redraw() {
		for(let c of this._comps) {
			c.redraw();
		}
	}
}

export { Tagger }
