class SinglePointerHandler {

	constructor(root) {

		this._root = root;
		this._touch_number = 0;
		this._effective_touch = null;
		this._dragging = false;

		this._on_pointer_started = () => {};
		this._on_pointer_moved = () => {};
		this._on_pointer_completed = () => {};
		this._on_pointer_canceled = () => {};

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
			["mouseleave", this._handle_touch_cancel],
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
			this._root.addEventListener(ev[0], touch_handler(ev[1].bind(this), ev[2]));
		}
		for(let ev of mouse_events) {
			this._root.addEventListener(ev[0], mouse_handler(ev[1].bind(this)));
		}
	}

	set on_pointer_started(fn) {
		this._on_pointer_started = fn;
	}

	set on_pointer_moved(fn) {
		this._on_pointer_moved = fn;
	}

	set on_pointer_completed(fn) {
		this._on_pointer_completed = fn;
	}

	set on_pointer_canceled(fn) {
		this._on_pointer_canceled = fn;
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
			this._on_pointer_started();
		} else if(this._effective_touch !== null) {
			this._on_pointer_canceled();
			this._effective_touch = null;
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

		this._on_pointer_moved(dx, dy);
	}

	_handle_touch_end(touch) {

		this._touch_number = Math.max(this._touch_number - 1, 0);

		if(this._effective_touch === null || this._effective_touch.id !== touch.id) {
			return;
		}

		let dx = this._effective_touch.x - this._effective_touch.sx;
		let dy = this._effective_touch.y - this._effective_touch.sy;
		let rx = this._effective_touch.rx;
		let ry = this._effective_touch.ry;
		let rxy = Math.sqrt(rx * rx + ry * ry);

		this._on_pointer_completed(dx, dy, rxy);
		this._effective_touch = null;
	}

	_handle_touch_cancel(touch) {

		this._touch_number = Math.max(this._touch_number - 1, 0);

		if(this._effective_touch === null || this._effective_touch.id !== touch.id) {
			return;
		}

		this._on_pointer_canceled();
		this._effective_touch = null;
	}
}

export { SinglePointerHandler }
