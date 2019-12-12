import {
	make_canonical_list_url,
	make_page_url,
	make_list_url,
	make_parent_url,
	make_sorted_url,
	make_filtered_url,
	get_page,
	get_sort_key,
	get_filter_text,
} from "./path.js";
import { append_links, fetch_resources, get_resource_title } from "./fetch.js";

class Controller {

	constructor(list, navi, pager) {

		this._list = list;
		this._navi = navi;
		this._pager = pager;
		this._in_pager = false;

		this._on_push_state = () => {};

		this._current = {
			location: null,
			resources: null,
			processed: null,
		};

		this._list.on_file_selected = (url) => {
			this.refresh_with(url);
		};
		this._list.on_directory_selected = (url) => {
			this.refresh_with(url);
		};
		this._navi.on_back_requested = (url) => {
			this.refresh_with(url);
		};
		this._navi.on_link_clicked = (url) => {
			this.refresh_with(url);
		};
		this._navi.on_sort_key_clicked = (key) => {
			this.refresh_with(make_sorted_url(this._current.location, key));
		};
		this._navi.on_filter_updated = (text) => {
			this.refresh_with(make_filtered_url(this._current.location, text));
		};
		this._pager.on_back_requested = (url) => {
			this.refresh_with(url);
		};
		this._pager.on_page_changed = (page_num) => {
			this.refresh_with(make_page_url(this._current.location, page_num));
		};
	}

	set on_push_state(fn) {
		this._on_push_state = fn;
	}

	async _request_resources_update(location) {
		try {
			let resp = await fetch_resources(location);
			this._update(undefined, resp.resources);
		} catch(err) {
			this._list.set_error_message(`failed to load: ${err}`);
		}
	}

	_update(location = undefined, resources = undefined) {

		let prev = this._current;
		this._current = {
			location: new URL(location === undefined ? prev.location : location),
			resources: resources === undefined ? prev.resources : resources,
			processed: prev.processed,
		};

		let prev_list_url = (prev.location !== null ? make_canonical_list_url(prev.location) : null);
		let cur_list_url = make_canonical_list_url(this._current.location);

		if(prev_list_url === null || prev_list_url.pathname !== cur_list_url.pathname) {

			this._current.resources = null;
			this._current.processed = null;
			this._list.reset();
			this._request_resources_update(this._current.location);

		}

		let prev_sort_key = (prev.location !== null ? get_sort_key(prev.location) : null);
		let cur_sort_key = get_sort_key(this._current.location);
		let prev_filter = (prev.location !== null ? get_filter_text(prev.location) : null);
		let cur_filter = get_filter_text(this._current.location);

		let order_changed = (prev_sort_key !== cur_sort_key || prev_filter !== cur_filter);

		if(resources !== undefined || (this._current.resources !== null && order_changed)) {

			let c = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
			let name_fn = (a, b) => (c.compare(a.name, b.name));
			let date_fn = (a, b) => (a.modified_at - b.modified_at);
			let rev = (f) => ((a, b) => (-f(a, b)));

			let comp_fn = new Map([
				["name_up", name_fn],
				["name_down", rev(name_fn)],
				["date_up", date_fn],
				["date_down", rev(date_fn)],
			]).get(cur_sort_key) || name_fn;

			let processed = this._current.resources.sort(comp_fn);
			if(cur_filter !== null) {
				processed = processed.filter((r) => r.name.includes(cur_filter));
			}
			processed = append_links(this._current.location, processed);
			this._current.processed = processed;

			let files = processed.filter((r) => r.type == "file");
			this._list.update(processed);
			this._pager.update(files);
		}

		let p = get_page(this._current.location);
		if(p !== null) {
			if(this._current.resources !== null) {
				this._pager.change_page(p);
			}
			this._pager.activate();
			this._list.deactivate_partial_thumbnails();
			this._in_pager = true;
		} else {
			this._pager.deactivate();
			this._list.activate_thumbnails();
			this._in_pager = false;
		}

		let suffix_items = [];

		if(this._current.resources !== null) {
			let c1 = this._current.resources.length;
			let c2 = this._current.processed.length;
			if(c1 != c2) {
				suffix_items.push(`${c2}/${c1}`);
			} else {
				suffix_items.push(`${c1}`);
			}
		}

		if(cur_sort_key !== null) {
			suffix_items.push(`sort=${cur_sort_key}`);
		}
		if(cur_filter !== null) {
			suffix_items.push(`filter="${cur_filter}"`);
		}

		let suffix = suffix_items.join(", ");

		this._navi.update_title("", get_resource_title(this._current.location), suffix);
		this._navi.update_back_link(make_parent_url(this._current.location));
		for(let k of ["name_up", "name_down", "date_up", "date_down"]) {
			let u = make_sorted_url(this._current.location, k);
			this._navi.update_sort_key_link(k, u);
		}
		this._navi.update_filter_text(cur_filter || "");
		this._pager.update_back_link(make_list_url(this._current.location));
	}

	refresh_with(location, replacing = false) {
		this._update(location);
		this._on_push_state(location, null, replacing);
	}

	rewrite_with(location) {
		this._update(location);
	}

	get in_pager() {
		return this._in_pager;
	}

	_move_page(diff) {
		if(this._current.resources === null) {
			return;
		}
		let p = pick_page(this._current.location);
		if(p !== null && p + diff >= 0 && p + diff < this._current.resources.length) {
			this.refresh_with(make_page_url(this._current.location, p + diff));
		}
	}

	move_to_next_page() {
		this._move_page(+1);
	}

	move_to_prev_page() {
		this._move_page(-1);
	}

	toggle_toolbox() {
		this._pager.toggle_toolbox();
	}

	switch_to_list() {
		this.refresh_with(make_list_url(this._current.location));
	}
}

export { Controller }
