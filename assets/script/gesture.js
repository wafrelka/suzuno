class GestureHandler {

	constructor(root_element) {

		this._root = root_element;
		this._document = document.documentElement;

		this._touch_number = 0;
		this._effective_touch = null;
		this._dragging = false;

		this.on_started = () => {};
		this.on_moved = () => {};
		this.on_canceled = () => {};
		this.on_swiped = () => {};
		this.on_tapped = () => {};

		let touch_events = [
			["touchstart", this._handle_touch_start, false],
			["touchmove", this._handle_touch_move, false],
			["touchend", this._handle_touch_end, true],
			["touchcancel", this._handle_touch_cancel, true],
		];
		let mouse_events = [
			["mousedown", this._handle_touch_start],
			["mousemove", this._handle_touch_move],
			["mouseup", this._handle_touch_end],
		];

		let touch_handler = (fn, cancel) => ((ev) => {
			if(cancel === true) {
				ev.preventDefault();
			}
			for(const t of ev.changedTouches) {
				fn({x: t.pageX, y: t.pageY, id: t.identifier, target: ev.target});
			}
		});
		let mouse_handler = (fn) => ((ev) => {
			fn({x: ev.pageX, y: ev.pageY, id: "mouseevent", target: ev.target});
		});

		for(let ev of touch_events) {
			let fn = touch_handler(ev[1].bind(this), ev[2]);
			this._root.addEventListener(ev[0], fn);
		}
		for(let ev of mouse_events) {
			let fn = mouse_handler(ev[1].bind(this));
			this._root.addEventListener(ev[0], fn);
		}
	}

	_handle_touch_start(touch) {

		this._touch_number += 1;

		if(this._touch_number === 1) {
			this._effective_touch = {
				sx: touch.x, sy: touch.y,
				x: touch.x, y: touch.y,
				rx: 0, ry: 0,
				id: touch.id,
			};
			this.on_started();
		} else if(this._effective_touch !== null) {
			this._effective_touch = null;
			this.on_canceled();
		}
	}

	_handle_touch_move(touch) {

		let eff = this._effective_touch;

		if(eff === null || eff.id !== touch.id) {
			return;
		}

		eff.x = touch.x;
		eff.y = touch.y;
		let dx = eff.x - eff.sx;
		let dy = eff.y - eff.sy;
		eff.rx = Math.max(eff.rx, Math.abs(dx));
		eff.ry = Math.max(eff.ry, Math.abs(dy));

		this.on_moved(dx, dy);
	}

	_handle_touch_end(touch) {

		this._touch_number = Math.max(this._touch_number - 1, 0);
		let eff = this._effective_touch;

		if(eff === null || eff.id !== touch.id) {
			return;
		}
		this._effective_touch = null;

		let dx = eff.x - eff.sx;
		let rx = eff.rx;
		let ry = eff.ry;
		let rxy = Math.sqrt(rx * rx + ry * ry);

		let width = this._document.clientWidth;
		let height = this._document.clientHeight;
		let swipe_limit = width * 0.1;
		let tap_limit = Math.min(width, height) * 0.05;

		if(Math.abs(dx) > swipe_limit) {
			this.on_swiped(dx > 0 ? +1 : -1);
		} else if(rxy < tap_limit) {
			this.on_tapped();
		} else {
			this.on_canceled();
		}
	}

	_handle_touch_cancel(touch) {

		this._touch_number = Math.max(this._touch_number - 1, 0);
		let eff = this._effective_touch;

		if(eff === null || eff.id !== touch.id) {
			return;
		}

		this._effective_touch = null;
		this.on_canceled();
	}
}

export { GestureHandler }
