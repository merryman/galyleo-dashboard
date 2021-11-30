import { Morph } from 'lively.morphic/morph.js';
import { pt } from 'lively.graphics/index.js';
import { signal } from 'lively.bindings/index.js';

export class Slider extends Morph {
  /*
  ** A Slider with a knob to set the value.
  ** properties:
  ** minValue: the minimum possible value for this slider
  ** maxValue: the maximum possible value for this slider
  ** increment: the distance between two adjacent numbers on this slider
  ** value:  The current value indicated by the knob of this slider.
  **
  */
  static get properties () {
    return {
      valueChanged: { derived: true, readOnly: true, isSignal: true },
      minValue: { defaultValue: 0 },
      maxValue: { defaultValue: 100 },
      increment: { defaultValue: 1 },
      value: {
        after: ['submorphs', 'minValue', 'maxValue', 'increment'],
        // set the value to the input value.  Make sure the value is OK,
        // Then set the knob position to the right position for this value
        // This is primarily set from the text inputs.
        set (aValue) {
          if (aValue == this.value) {
            return;
          }
          aValue = this._normalizeValue_(aValue);
          const xPos = this._xPosForValue_(aValue);
          this.whenRendered().then(_ => {
            this.knob.position = pt(xPos, 0);
          });
        },
        // read the  values from the position of the knob.  Make sure
        // that the knob exists (i.e., is rendered) before calling.
        get () {
          if (this.knob) {
            return this.valueForX(this.knob.position.x);
          } else {
            return this._normalizeValue_((this.maxValue + this.minValue) / 2);
          }
        }
      }
    };
  }

  // convenience to get the knob

  get knob () {
    return this.getSubmorphNamed('knob');
  }

  get minPos () {
    return 0;
  }

  // Fire the valueChanged signal.  This should only be fired once when
  // the value changes.  ATM, whenever the value changes the knob changes
  // position, so the knob position is tied to this.
  signalValueChanged () {
    signal(this, 'valueChanged');
  }

  // The maximum position of the  knob.  The value of the knob
  // is given by its x-position (left-hand edge), so the max position has the
  // right-hand edge at the end of the slider.

  get maxPos () {
    return this.extent.x - this.knob.extent.x;
  }

  // make sure a value is an integer number of increments, and it's between the
  // minimum and the maximum value

  _normalizeValue_ (aValue) {
    aValue = Math.round(aValue / this.increment) * this.increment;
    return Math.max(Math.min(aValue, this.maxValue), this.minValue);
  }

  // return the x-coordinate corresponding to a particular value.  First, normalize
  // the value, then compute its proportion of the total range.  Then multiply
  // that by the position range, add to the minimum, and you have the x-coordinate
  // corresponding to a value.

  _xPosForValue_ (value) {
    if (value >= this.maxValue) {
      return this.maxPos;
    }
    if (value <= this.minValue) {
      return this.minPos;
    }
    value = this._normalizeValue_(value);
    return (value - this.minValue) / (this.maxValue - this.minValue) * (this.maxPos - this.minPos) + this.minPos;
  }

  // return the value corresponding to an x-coordinate.  compute the x-position as
  // a proportion of the total range.  Then multiply that by the value range, add
  // to the minimum value, then normalize to it's an integer multiple of increment.

  valueForX (xPos) {
    const value = (xPos - this.minPos) / (this.maxPos - this.minPos) * (this.maxValue - this.minValue) + this.minValue;
    return this._normalizeValue_(value);
  }

  // Set defaults for the properties to make sure we have them

  setDefaults () {
    this.minValue = 0; this.maxValue = 100; this.increment = 1;
    this.value = 50;
  }

  // ensure that none of the basic properties are NaNs.  Try to preserve
  // existing properties (which is why this isn't just setDefaults)

  _ensureProperties_ () {
    if (isNaN(this.maxValue) && isNaN(this.minValue)) {
      this.setDefaults();
    } else if (isNaN(this.maxValue)) {
      this.maxValue = this.minValue + 100;
      this.increment = 1;
    } else if (isNaN(this.minValue)) {
      this.minValue = this.maxValue - 100;
      this.increment = 1;
    } else if (isNaN(this.increment)) {
      this.increment = (this.maxValue - this.minValue) * 0.01;
    }
  }

  onLoad () {
    this._ensureProperties_();
  }

  incrementValue () {
    this.value += this.increment;
  }

  decrementValue () {
    this.value -= this.increment;
  }

  // A utility called by the drag routines, below

  _normalizePosition_ (x) {
    const normalX = Math.max(this.minPos, Math.min(this.maxPos, x - this.getSubmorphNamed('knob').width / 2));
    this.knob.position = pt(normalX, 0);
  }

  // these routines mirror the corresponding routines in Knob.  The basics of all
  // of this is just to move the knob in response to mouse actions.  When the
  // user drags the slider, he thinks he's dragging the knob.

  _doEvt_ (evt) {
    this._normalizePosition_(evt.positionIn(this).x);
  }

  onMouseDown (evt) {
    this._doEvt_(evt);
  }

  onDragStart (evt) {
    this._doEvt_(evt);
  }

  onDragEnd (evt) {
    this._doEvt_(evt);
  }

  onDrag (evt) {
    this._doEvt_(evt);
  }
}

class SliderInputLabel extends Morph {
  static get properties () {
    return {
      defaultWidth: {
        readOnly: true,
        get () { return 36; }
      },
      fitting: {
        type: 'Enum',
        values: ['scaleToFit', 'fitToContent', 'clipContent'],
        defaultValue: 'scaleToFit'
      },
      value: {
        derived: true,
        set (v) {
          this.getSubmorphNamed('sliderValue').input = String(v);
          this.relayout();
        },
        get () {
          return this.getSubmorphNamed('sliderValue').input;
        }
      }
    };
  }

  relayout () {
    if (this.fitting) this[this.fitting]();
    this.submorphs.forEach(m => {
      m.center = m.center.withX(this.width / 2);
    });
  }

  scaleToFit () {
    const defaultFontSize = 13;
    const defaultPadding = 8;
    const valueContainer = this.getSubmorphNamed('sliderValue');
    const nominalWidth = valueContainer.env.fontMetric.measure({
      fontFamily: valueContainer.fontFamily,
      fontSize: 13
    }, valueContainer.input).width + this.defaultWidth / 2;
    valueContainer.fontSize = defaultFontSize * Math.min(1, (this.width - defaultPadding) / nominalWidth);
  }

  fitToContent () {
    const valueContainer = this.getSubmorphNamed('sliderValue');
    valueContainer.width = valueContainer.textBounds().width + 10;
  }

  clipContent () {
    this.getSubmorphNamed('sliderValue').width = this.defaultWidth;
  }

  onMouseUp (evt) {
    super.onMouseUp(evt);
    const actions = {
      'increment button': () => signal(this, 'increment'),
      'decrement button': () => signal(this, 'decrement')
    };

    const action = actions[evt.targetMorph.name];
    if (action) action();
  }
}

class SliderKnob extends Morph {
  // A Slider knob.  This is freely dragged along the x-axis between the
  // bounds given by this.owner.extent.x - this.width (right edge never goes
  // beyond the owner bounds), and its y position is always 0.
  // _normalizePosition_ just ensures that the x position is within reasonable
  // bounds and the y position is 0
  _normalizePosition_ () {
    const x = this.position.x;
    const maxPosition = this.owner.extent.x - this.width;
    this.position = pt(Math.max(0, Math.min(maxPosition, x)), 0);
    this._updateValue_();
  }

  // The drag events are all the same -- do the super, which will move the knob,
  // and then normalize position

  onDragStart (evt) {
    super.onDragStart(evt);
    this._normalizePosition_();
  }

  onDrag (evt) {
    super.onDrag(evt);
    this._normalizePosition_();
  }

  onDragEnd (evt) {
    super.onDragEnd(evt);
    this._normalizePosition_();
  }

  // _updateValue_().  Dead code from when we had a a value label on
  // the knob, which was a bad idea.

  _updateValue_ () {
    // this.getSubmorphNamed('valueLabel').setValue(this.owner.valueForX(this.position.x));
  }
}

class SliderWithValue extends Morph {
  // The only property is a signal which shows the value has changed.  This
  // is connected to the valueChanged property in the contained slider as
  // both a convenience and to permit code using this to access the top-level
  // valueChanged signal
  static get properties () {
    return {
      valueChanged: { derived: true, isSignal: true, readOnly: true }
    };
  }

  // fire the valueChanged signal.  This method should only be
  // called by the connection to the contained valueChanged signal
  signalValueChanged () {
    signal(this, 'valueChanged');
  }

  // Get the underlying slider's value.  A convenience method for
  // code which uses this
  get value () {
    return this.getSubmorphNamed('slider').value;
  }

  // A wrapper around Slider to update and read the value from the
  // input ranges.  This mostly just a couple of connection targets.
  // updateValue.  This is called when the knob changes position.
  // connected to the knob position.
  // Just displays the value of the knob in the  input field
  updateValue () {
    this.get('slider label').value = this.getSubmorphNamed('slider').value;
  }

  // setSliderValue.  This is called when the  inputs is accepted.
  // onInput from the input morph is hardcoded to this.  Sets the value
  // of the underlying Slider.
  setSliderValue () {
    this.getSubmorphNamed('slider').value = this.get('slider label').value;
  }
}

class DoubleSlider extends Morph {
  /*
  ** A Double Slider with knobs on the max and min.
  ** properties:
  ** minValue: the minimum possible value for this slider
  ** maxValue: the maximum possible value for this slider
  ** increment: the distance between two adjacent numbers on this slider
  ** range: a derived object with max and min: the current values indicated
  **        by the knobs of this slider.
  */
  static get properties () {
    return {
      rangeChanged: { derived: true, readOnly: true, isSignal: true },
      minValue: { defaultValue: 0 },
      maxValue: { defaultValue: 100 },
      increment: { defaultValue: 1 },
      range: {
        after: ['submorphs', 'minValue', 'maxValue', 'increment'],
        // set the range to the input range.  First, make sure the values are OK,
        // and range.min < range.max by at least increment.  Then set the knob
        // positions to the right positions for this value.  This is primarily
        // set from the text inputs.
        set (aRange) {
          let minVal = this._normalizeValue_(aRange.min);
          let maxVal = this._normalizeValue_(aRange.max);
          if (maxVal == minVal) {
            if (maxVal == this.maxValue) {
              minVal = maxVal - this.increment;
            } else {
              maxVal = minVal + this.increment;
            }
          }
          this.whenRendered().then(_ => {
            this.minKnob.position = pt(this._xForValue_(minVal), 0);
            this.maxKnob.position = pt(this._xForValue_(maxVal), 0);
            this.updateConnector();
          });
        },
        // read the range values from the positions of the knobs.  Make sure
        // that the minKnob exists (i.e., is rendered) before calling.
        get () {
          if (this.minKnob) {
            return {
              min: this.valueForX(this.minKnob.position.x),
              max: this.valueForX(this.maxKnob.position.x)
            };
          }
        }

      }
    };
  }

  updateConnector () {
    const conn = this.getSubmorphNamed('connector');
    conn.width = this.maxKnob.center.subPt(this.minKnob.center).x;
    conn.leftCenter = this.minKnob.center;
  }

  // convenience to get the right-hand knob

  get maxKnob () {
    return this.getSubmorphNamed('maxKnob');
  }

  // convenience to get the left-hand knob

  get minKnob () {
    return this.getSubmorphNamed('minKnob');
  }

  // Show that the range has changed.  Since any range change involves moving the knobs, this
  // is tied via signal to the range position.  Every user of this part should listen for
  // the rangeChanged signal

  signalRangeChanged () {
    signal(this, 'rangeChanged');
  }

  // The maximum position of the right-hand knob.  The value of the knob
  // is given by its x-position (left-hand edge), so the max position has the
  // right-hand edge at the end of the slider.

  get maxPosition () {
    return this.extent.x - this.maxKnob.width;
  }

  // Get the range of possible positions for each knob.  the minKnob has its right
  // edge adjacent to the left edge of the maxKnob

  get positionRanges () {
    return {
      minKnob: { min: 0, max: this.maxKnob.position.x - this.minKnob.width },
      maxKnob: {
        min: this.minKnob.position.x + this.minKnob.width,
        max: this.maxPosition
      }
    };
  }

  // make sure a value is an integer number of increments, and it's between the
  // minimum and the maximum value

  _normalizeValue_ (aValue) {
    const value = Math.round(aValue / this.increment) * this.increment;
    return Math.max(Math.min(this.maxValue, value), this.minValue);
  }

  get _valueRange_ () { return (this.maxValue - this.minValue); }

  // return the value as a proportion of the total range between the minimum
  // possible value and the maximum possible value.  This is always between 0 and 1

  _proportionalValue_ (aValue) {
    return (aValue - this.minValue) / this._valueRange_;
  }

  // return the x position as a a proportion of the distance between min and max
  // positions.  Since minPosition is always 0, this is a proportion of maxPosition

  _proportionalRange_ (xPos) {
    return xPos / this.maxPosition;
  }

  // return the x-coordinate corresponding to a particular value.  Just multiply
  // the proportionalValue (% of the range) by the max position.

  _xForValue_ (aValue) {
    return this._proportionalValue_(aValue) * this.maxPosition;
  }

  // return the value  corresponding to an x-coordinate.  Just get the proportional
  // range, multiply by the value range to get the offset from the min, add the min
  // to get the true number, then make sure it lines up with the increments

  valueForX (anX) {
    //
    return this._normalizeValue_(this._proportionalRange_(anX) * this._valueRange_ + this.minValue);
  }

  _startDraggingClosestHandle (evt) {
    if (evt.positionIn(this.minKnob).r() < evt.positionIn(this.maxKnob).r()) { this._draggedHandle = this.minKnob; } else { this._draggedHandle = this.maxKnob; }
    // this._draggedHandle.center = evt.positionIn(this).withY(this.height / 2);
  }

  _stopDraggingHandle () {
    this._draggedHandle = null;
  }

  _dragSelectedKnob (evt) {
    if (this._draggedHandle) {
      this._draggedHandle.onDrag(evt);
    }
  }

  incrementMinValue () {
    const { min, max } = this.range;
    this.range = { min: min + 1, max };
  }

  decrementMinValue () {
    const { min, max } = this.range;
    this.range = { min: min - 1, max };
  }

  incrementMaxValue () {
    const { min, max } = this.range;
    this.range = { min, max: max + 1 };
  }

  decrementMaxValue () {
    const { min, max } = this.range;
    this.range = { min, max: max - 1 };
  }

  onDragStart (evt) {
    this._startDraggingClosestHandle(evt);
  }

  onDragEnd (evt) {
    this._stopDraggingHandle();
  }

  onDrag (evt) {
    this._dragSelectedKnob(evt);
  }
}

class DoubleSliderKnob extends Morph {
  // A DoubleSlider knob.  This is freely dragged along the x-axis between the
  // bounds given by this.owner.positionRanges, and its y position is always 0.
  // _normalizePosition_ just ensures that the x position is within reasonable
  // bounds and the y position is 0
  _normalizePosition_ () {
    const positionRange = this.owner.positionRanges[this.name];
    const x = Math.min(positionRange.max, Math.max(positionRange.min, this.position.x));
    this.position = pt(x, 0);
    this._updateValue_();
  }

  // The drag events are all the same -- do the super, which will move the knob,
  // and then normalize position

  onDragStart (evt) {
    super.onDragStart(evt);
    this._normalizePosition_();
  }

  onDrag (evt) {
    this.center = evt.positionIn(this.owner).withY(this.owner.height / 2);
    this._normalizePosition_();
  }

  onDragEnd (evt) {
    super.onDragEnd(evt);
    this._normalizePosition_();
  }

  // _updateValue_().  Dead code from when we had a a value label on
  // the knob, which was a bad idea.

  _updateValue_ () {
    this.owner.updateConnector();
    // this.getSubmorphNamed('valueLabel').setValue(this.owner.valueForX(this.position.x));
  }
}

class DoubleSliderWithValues extends Morph {
  // The only property is a signal which shows the range has changed.  This
  // is connected to the rangeChanged property in the contained slider as
  // both a convenience and to permit code using this to access the top-level
  // rangeChanged signal
  static get properties () {
    return {
      rangeChanged: { derived: true, isSignal: true, readOnly: true }
    };
  }

  // fire the rangeChanged signal.  This method should only be
  // called by the connection to the contained rangeChanged signal
  signalRangeChanged () {
    signal(this, 'rangeChanged');
  }

  // A convenience method to get the range of the underlying slider, so
  // any user of this doesn't need to dig into the underlying morph
  get range () {
    return this.getSubmorphNamed('doubleSlider').range;
  }

  // A wrapper around DoubleSlider to update and read values from the
  // input ranges.  This mostly just a couple of connection targets.
  // displayRange.  This is called when one of the knobs changes positions.
  // connected to the knob positions.
  // Just displays the values of the knobs in the two input fields
  displayRange () {
    const range = this.getSubmorphNamed('doubleSlider').range;
    this.getSubmorphNamed('minInput').value = range.min;
    this.getSubmorphNamed('maxInput').value = range.max;
  }

  // setRange.  This is called when one of the two inputs is accepted.
  // onInput from each input morph is hardcoded to this.  Sets the range
  // of the underlying doubleSlider.
  setRange () {
    const range = {
      min: this.getSubmorphNamed('minInput').value,
      max: this.getSubmorphNamed('maxInput').value
    };
    this.getSubmorphNamed('doubleSlider').range = range;
  }
}
