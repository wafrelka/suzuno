import { build_component } from "./component.js";
import { GestureHandler } from "./gesture.js";
import { AnimationDebouncer } from "./animation.js";
import { get_friendly_size_text } from "./util.js";

function in_range(n, lo, hi) {
	return lo <= n && n < hi;
}

class Pager {

	constructor(root_elem, num_extra_pages) {

		let back_fn = (ev) => {
			ev.preventDefault();
			this._on_back_requested(ev.currentTarget.href);
		};
		let rot_fn = () => {
			let n = this._current_num;
			let h = this._rot_history;
			if(n === null) {
				return;
			}
			h.set(n, (h.get(n) || 0) + 1);
			this._redraw();
		};
		let completed_fn = () => {
			if(this._initial_loading_phase) {
				this._initial_loading_phase = false;
				this._redraw();
			}
		};

		this._view = build_component(root_elem, {
			classes: ["active", "interacted"],
			children: {
				container: {
					query: ".pager-container",
					classes: ["animated"],
					items: {
						classes: ["visible", "blank-page"],
						children: {
							image_container: { query: ".pager-page-image-container", },
							name: { query: ".pager-page-name", },
							size: { query: ".pager-page-size", },
							download_link: { query: ".pager-page-download-link", },
							toolbox_top: {
								query: ".pager-page-toolbox-top",
								classes: ["active"],
							},
							toolbox_bottom: {
								query: ".pager-page-toolbox-bottom",
								classes: ["active"],
							},
							back_link: {
								query: ".pager-page-back-link",
								handlers: { click: back_fn, },
							},
							rot_button: {
								query: ".pager-page-rot-button",
								handlers: { click: rot_fn, },
							},
							image: {
								query: ".pager-page-image",
								classes: ["landscape", "animated"],
								handlers: {
									load: completed_fn,
									error: completed_fn,
								},
							},
						},
					},
				},
			},
		});

		this._active = false;
		this._resources = null;

		this._num_extra_pages = num_extra_pages;
		this._current_num = 0;
		this._position = 0;
		this._initial_loading_phase = false;
		this._toolbox_activated_at = null;
		this._rot_history = new Map();

		this._view.container.resize(this._num_extra_pages * 2 + 1);

		this._move_animation = new AnimationDebouncer((param) => {
			this._view.container.animated = param.animation;
			this._view.container.element.style.transform = param.transform;
		});

		this._on_page_changed = () => {};
		this._on_back_requested = () => {};

		this._move_to_base();

		let img_containers = this._view.container.items.map(x => x.image_container.element);
		let gesture_handler = new GestureHandler(img_containers);
		this._gesture_handler = gesture_handler;

		gesture_handler.on_moved = (dx, _) => {
			this._move_to(-dx);
		};
		gesture_handler.on_swiped = (dir) => {

			let mov = -dir;
			let next_num = this._current_num + mov;
			let res_len = (this._resources !== null ? this._resources.length : 0);

			if(next_num !== this._current_num && in_range(next_num, 0, res_len)) {
				this._on_page_changed(next_num);
			} else {
				this._move_to_base_animated();
			}
		};
		gesture_handler.on_tapped = () => {
			this._move_to_base_animated();
			this.toggle_toolbox();
		};
		gesture_handler.on_canceled = () => {
			this._move_to_base_animated();
		};
	}

	set on_page_changed(fn) {
		this._on_page_changed = fn;
	}

	set on_back_requested(fn) {
		this._on_back_requested = fn;
	}

	_move_to(position, page_diff = 0, animation = false, queueing = false) {

		this._position = position;

		let trans_x_base = (this._num_extra_pages + page_diff) * -100;
		let trans_x = -position;

		let arg = {
			transform: `translateX(${trans_x_base}%) translateX(${trans_x}px)`,
			animation: animation,
		};

		if(queueing === true) {
			this._move_animation.push_after(arg);
		} else {
			this._move_animation.push(arg);
		}
	}

	_move_to_base_animated_after() {
		this._move_to(0, 0, true, true);
	}

	_move_to_base_animated() {
		this._move_to(0, 0, true);
	}

	_move_to_base() {
		this._move_to(0);
	}

	_redraw_page(index, page_num, visible, loading) {

		let item = this._view.container.items[index];

		let res_len = (this._resources === null ? 0 : this._resources.length);
		let blank = !in_range(page_num, 0, res_len);

		item.visible = visible;
		item.blank_page = blank;

		if(blank) {
			item.name.text = "";
			item.size.text = "";
			item.download_link.href = "";
			item.image.active = false;
			item.image.src = null;
			return item.image.complete;
		}

		let res = this._resources[page_num];

		item.name.text = res.name;
		item.size.text = get_friendly_size_text(res.size);
		item.download_link.href = res.file_url;
		item.image.active = loading;
		item.image.src = res.file_url;

		let rot = this._rot_history.get(page_num) || 0;
		let deg = rot * 90;
		let landscape = ((rot & 1) == 1);
		item.image.landscape = landscape;
		item.image.animated = this._active;
		item.image.element.style.transform = `rotate(${deg}deg)`;

		return item.image.complete;
	}

	_redraw() {
		let n = this._num_extra_pages;
		let cur_ok = this._redraw_page(n, this._current_num, true, true);
		for(let d = -n; d <= n; d += 1) {
			if(d === 0) {
				continue;
			}
			let visible = (-1 <= d && d <= 1);
			let loading = !this._initial_loading_phase || cur_ok;
			this._redraw_page(n + d, this._current_num + d, visible, loading);
		}
	}

	hide_toolbox() {
		for(let item of this._view.container.items) {
			item.toolbox_top.active = false;
			item.toolbox_bottom.active = false;
		}
		this._toolbox_activated_at = null;
	}

	show_toolbox() {

		this._toolbox_activated_at = Date.now();
		let timeout = 5000;

		for(let item of this._view.container.items) {
			item.toolbox_top.active = true;
			item.toolbox_bottom.active = true;
		}

		let deactivation_fn = () => {
			if(this._toolbox_activated_at === null) {
				return;
			}
			if(this._toolbox_activated_at + timeout > Date.now()) {
				return;
			}
			this.hide_toolbox();
		};

		setTimeout(deactivation_fn, timeout);
	}

	toggle_toolbox() {
		if(this._toolbox_activated_at !== null) {
			this.hide_toolbox();
		} else {
			this.show_toolbox();
		}
	}

	change_page(page_num) {

		let diff = page_num - this._current_num;
		this._current_num = page_num;

		if(this._active && diff !== 0) {
			this._initial_loading_phase = false;
		}

		let near = (Math.abs(diff) <= this._num_extra_pages);
		if(near) {
			let front_to_back = (diff >= 0);
			for(let i = 0; i < Math.abs(diff); i += 1) {
				this._view.container.rotate_items(front_to_back);
			}
			if(this._active) {
				this._move_to(this._position, -diff);
				this._move_to_base_animated_after();
			} else {
				this._move_to_base();
			}
		} else {
			this._move_to_base();
		}

		this._redraw();
	}

	activate() {
		if(this._active) {
			return;
		}
		this._active = true;
		this._initial_loading_phase = true;
		this._view.active = true;
		this._view.interacted = true;
		this._redraw();
	}

	deactivate() {
		if(!this._active) {
			return;
		}
		this._active = false;
		this._view.active = false;
		this._redraw();
	}

	update(resources) {
		/*
			resources := array({
				name: string,
				file_url: string,
			})
		*/
		this._resources = resources;
		this._rot_history = new Map();
		this._redraw();
	}

	update_back_link(back_link) {
		for(let item of this._view.container.items) {
			item.back_link.href = back_link;
		}
	}
}

export { Pager }
