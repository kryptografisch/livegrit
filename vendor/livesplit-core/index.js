// tslint:disable
import { preloadWasm } from "./preload.js";
const wasm = await preloadWasm();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function allocUint8Array(src) {
    const cap = src.length;
    const ptr = wasm.alloc(cap);
    const slice = new Uint8Array(wasm.memory.buffer, ptr, cap);
    slice.set(src);
    return { ptr, len: cap, cap };
}
function allocString(str) {
    const cap = 3 * str.length + 1;
    const ptr = wasm.alloc(cap);
    const slice = new Uint8Array(wasm.memory.buffer, ptr, cap);
    const stats = encoder.encodeInto(str, slice);
    slice[stats.written] = 0;
    return { ptr, len: stats.written, cap };
}
function decodeSlice(ptr) {
    const memory = new Uint8Array(wasm.memory.buffer);
    const len = wasm.get_buf_len();
    return memory.slice(ptr, ptr + len);
}
function decodePtrLen(ptr, len) {
    const memory = new Uint8Array(wasm.memory.buffer);
    return memory.slice(ptr, ptr + len);
}
function decodeString(ptr) {
    return decoder.decode(decodeSlice(ptr));
}
function dealloc(slice) {
    wasm.dealloc(slice.ptr, slice.cap);
}
/**
 * A constant that is part of the formula to calculate the sigma of a gaussian
 * blur for a background image. Check its documentation for a deeper
 * explanation.
 */
export const BLUR_FACTOR = 0.05;
/**
 * A Timing Method describes which form of timing is used. This can either be
 * Real Time or Game Time.
 */
export var TimingMethod;
(function (TimingMethod) {
    /**
     * Real Time is the unmodified timing that is as close to an atomic clock as
     * possible.
     */
    TimingMethod[TimingMethod["RealTime"] = 0] = "RealTime";
    /**
     * Game Time describes the timing that is provided by the game that is being
     * run. This is entirely optional and may either be Real Time with loading
     * times removed or some time provided by the game.
     */
    TimingMethod[TimingMethod["GameTime"] = 1] = "GameTime";
})(TimingMethod || (TimingMethod = {}));
/**
 * Describes which phase the timer is currently in. This tells you if there's an
 * active speedrun attempt and whether it is paused or it ended.
 */
export var TimerPhase;
(function (TimerPhase) {
    /** There's currently no active attempt. */
    TimerPhase[TimerPhase["NotRunning"] = 0] = "NotRunning";
    /** There's an active attempt that didn't end yet and isn't paused. */
    TimerPhase[TimerPhase["Running"] = 1] = "Running";
    /** There's an attempt that already ended, but didn't get reset yet. */
    TimerPhase[TimerPhase["Ended"] = 2] = "Ended";
    /** There's an active attempt that is currently paused. */
    TimerPhase[TimerPhase["Paused"] = 3] = "Paused";
})(TimerPhase || (TimerPhase = {}));
/** An event informs you about a change in the timer. */
export var Event;
(function (Event) {
    /** The timer has been started. */
    Event[Event["Started"] = 0] = "Started";
    /**
     * A split happened. Note that the final split is signaled by `Finished`.
     */
    Event[Event["Splitted"] = 1] = "Splitted";
    /**
     * The final split happened, the run is now finished, but has not been reset
     * yet.
     */
    Event[Event["Finished"] = 2] = "Finished";
    /** The timer has been reset. */
    Event[Event["Reset"] = 3] = "Reset";
    /** The previous split has been undone. */
    Event[Event["SplitUndone"] = 4] = "SplitUndone";
    /** The current split has been skipped. */
    Event[Event["SplitSkipped"] = 5] = "SplitSkipped";
    /** The timer has been paused. */
    Event[Event["Paused"] = 6] = "Paused";
    /** The timer has been resumed. */
    Event[Event["Resumed"] = 7] = "Resumed";
    /** All the pauses have been undone. */
    Event[Event["PausesUndone"] = 8] = "PausesUndone";
    /** All the pauses have been undone and the timer has been resumed. */
    Event[Event["PausesUndoneAndResumed"] = 9] = "PausesUndoneAndResumed";
    /** The comparison has been changed. */
    Event[Event["ComparisonChanged"] = 10] = "ComparisonChanged";
    /** The timing method has been changed. */
    Event[Event["TimingMethodChanged"] = 11] = "TimingMethodChanged";
    /** The game time has been initialized. */
    Event[Event["GameTimeInitialized"] = 12] = "GameTimeInitialized";
    /** The game time has been set. */
    Event[Event["GameTimeSet"] = 13] = "GameTimeSet";
    /** The game time has been paused. */
    Event[Event["GameTimePaused"] = 14] = "GameTimePaused";
    /** The game time has been resumed. */
    Event[Event["GameTimeResumed"] = 15] = "GameTimeResumed";
    /** The loading times have been set. */
    Event[Event["LoadingTimesSet"] = 16] = "LoadingTimesSet";
    /** A custom variable has been set. */
    Event[Event["CustomVariableSet"] = 17] = "CustomVariableSet";
})(Event || (Event = {}));
/** An error that occurred when a command was being processed. */
export var CommandError;
(function (CommandError) {
    /** The operation is not supported. */
    CommandError[CommandError["Unsupported"] = -1] = "Unsupported";
    /** The timer can't be interacted with at the moment. */
    CommandError[CommandError["Busy"] = -2] = "Busy";
    /** There is already a run in progress. */
    CommandError[CommandError["RunAlreadyInProgress"] = -3] = "RunAlreadyInProgress";
    /** There is no run in progress. */
    CommandError[CommandError["NoRunInProgress"] = -4] = "NoRunInProgress";
    /** The run is already finished. */
    CommandError[CommandError["RunFinished"] = -5] = "RunFinished";
    /** The time is negative, you can't split yet. */
    CommandError[CommandError["NegativeTime"] = -6] = "NegativeTime";
    /** The last split can't be skipped. */
    CommandError[CommandError["CantSkipLastSplit"] = -7] = "CantSkipLastSplit";
    /** There is no split to undo. */
    CommandError[CommandError["CantUndoFirstSplit"] = -8] = "CantUndoFirstSplit";
    /** The timer is already paused. */
    CommandError[CommandError["AlreadyPaused"] = -9] = "AlreadyPaused";
    /** The timer is not paused. */
    CommandError[CommandError["NotPaused"] = -10] = "NotPaused";
    /** The requested comparison doesn't exist. */
    CommandError[CommandError["ComparisonDoesntExist"] = -11] = "ComparisonDoesntExist";
    /** The game time is already initialized. */
    CommandError[CommandError["GameTimeAlreadyInitialized"] = -12] = "GameTimeAlreadyInitialized";
    /** The game time is already paused. */
    CommandError[CommandError["GameTimeAlreadyPaused"] = -13] = "GameTimeAlreadyPaused";
    /** The game time is not paused. */
    CommandError[CommandError["GameTimeNotPaused"] = -14] = "GameTimeNotPaused";
    /** The time could not be parsed. */
    CommandError[CommandError["CouldNotParseTime"] = -15] = "CouldNotParseTime";
    /** The timer is currently paused. */
    CommandError[CommandError["TimerPaused"] = -16] = "TimerPaused";
    /** The runner decided to not reset the run. */
    CommandError[CommandError["RunnerDecidedAgainstReset"] = -17] = "RunnerDecidedAgainstReset";
})(CommandError || (CommandError = {}));
/**
 * Checks if the result of a command is a successful event instead of an error.
 */
export function isEvent(result) {
    return result >= 0;
}
/**
 * The Language enum describes all the languages that are supported for
 * localization.
 */
export var Language;
(function (Language) {
    Language[Language["English"] = 0] = "English";
    Language[Language["Dutch"] = 1] = "Dutch";
    Language[Language["French"] = 2] = "French";
    Language[Language["German"] = 3] = "German";
    Language[Language["Italian"] = 4] = "Italian";
    Language[Language["Portuguese"] = 5] = "Portuguese";
    Language[Language["Polish"] = 6] = "Polish";
    Language[Language["Russian"] = 7] = "Russian";
    Language[Language["Spanish"] = 8] = "Spanish";
    Language[Language["BrazilianPortuguese"] = 9] = "BrazilianPortuguese";
    Language[Language["ChineseSimplified"] = 10] = "ChineseSimplified";
    Language[Language["ChineseTraditional"] = 11] = "ChineseTraditional";
    Language[Language["Japanese"] = 12] = "Japanese";
    Language[Language["Korean"] = 13] = "Korean";
})(Language || (Language = {}));
/**
 * An Atomic Date Time represents a UTC Date Time that tries to be as close to
 * an atomic clock as possible.
 */
export class AtomicDateTimeRef {
    ptr;
    /**
     * Represents whether the date time is actually properly derived from an
     * atomic clock. If the synchronization with the atomic clock didn't happen
     * yet or failed, this is set to false.
     */
    isSynchronized() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.AtomicDateTime_is_synchronized(this.ptr) != 0;
        return result;
    }
    /**
     * Converts this atomic date time into a RFC 3339 formatted date time.
     */
    toRfc3339() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.AtomicDateTime_to_rfc3339(this.ptr);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * An Atomic Date Time represents a UTC Date Time that tries to be as close to
 * an atomic clock as possible.
 */
export class AtomicDateTimeRefMut extends AtomicDateTimeRef {
}
/**
 * An Atomic Date Time represents a UTC Date Time that tries to be as close to
 * an atomic clock as possible.
 */
export class AtomicDateTime extends AtomicDateTimeRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.AtomicDateTime_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * An Attempt describes information about an attempt to run a specific category
 * by a specific runner in the past. Every time a new attempt is started and
 * then reset, an Attempt describing general information about it is created.
 */
export class AttemptRef {
    ptr;
    /**
     * Accesses the unique index of the attempt. This index is unique for the
     * Run, not for all of them.
     */
    index() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Attempt_index(this.ptr);
        return result;
    }
    /**
     * Accesses the split time of the last segment. If the attempt got reset
     * early and didn't finish, this may be empty.
     */
    time() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeRef(wasm.Attempt_time(this.ptr));
        return result;
    }
    /**
     * Accesses the amount of time the attempt has been paused for. If it is not
     * known, this returns null. This means that it may not necessarily be
     * possible to differentiate whether a Run has not been paused or it simply
     * wasn't stored.
     */
    pauseTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpanRef(wasm.Attempt_pause_time(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Accesses the point in time the attempt was started at. This returns null
     * if this information is not known.
     */
    started() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new AtomicDateTime(wasm.Attempt_started(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Accesses the point in time the attempt was ended at. This returns null if
     * this information is not known.
     */
    ended() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new AtomicDateTime(wasm.Attempt_ended(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * An Attempt describes information about an attempt to run a specific category
 * by a specific runner in the past. Every time a new attempt is started and
 * then reset, an Attempt describing general information about it is created.
 */
export class AttemptRefMut extends AttemptRef {
}
/**
 * An Attempt describes information about an attempt to run a specific category
 * by a specific runner in the past. Every time a new attempt is started and
 * then reset, an Attempt describing general information about it is created.
 */
export class Attempt extends AttemptRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * The Blank Space Component is simply an empty component that doesn't show
 * anything other than a background. It mostly serves as padding between other
 * components.
 */
export class BlankSpaceComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Blank Space Component is simply an empty component that doesn't show
 * anything other than a background. It mostly serves as padding between other
 * components.
 */
export class BlankSpaceComponentRefMut extends BlankSpaceComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.BlankSpaceComponent_state_as_json(this.ptr);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state.
     */
    state() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new BlankSpaceComponentState(wasm.BlankSpaceComponent_state(this.ptr));
        return result;
    }
}
/**
 * The Blank Space Component is simply an empty component that doesn't show
 * anything other than a background. It mostly serves as padding between other
 * components.
 */
export class BlankSpaceComponent extends BlankSpaceComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.BlankSpaceComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Blank Space Component.
     */
    static new() {
        const result = new BlankSpaceComponent(wasm.BlankSpaceComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.BlankSpaceComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class BlankSpaceComponentStateRef {
    ptr;
    /**
     * The size of the component.
     */
    size() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.BlankSpaceComponentState_size(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class BlankSpaceComponentStateRefMut extends BlankSpaceComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class BlankSpaceComponentState extends BlankSpaceComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.BlankSpaceComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A Carousel Component cycles through its child components one at a time,
 * periodically switching to the next child after a configurable interval.
 */
export class CarouselComponentRef {
    ptr;
    /**
     * Returns the number of components in the carousel.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponent_len(this.ptr);
        return result;
    }
    /**
     * Returns the size override of the carousel. 0xFFFFFFFF means automatic
     * sizing.
     */
    size() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponent_size(this.ptr);
        return result;
    }
    /**
     * Returns the interval in seconds between switching to the next child.
     */
    interval() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponent_interval(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Carousel Component cycles through its child components one at a time,
 * periodically switching to the next child after a configurable interval.
 */
export class CarouselComponentRefMut extends CarouselComponentRef {
    /**
     * Adds a component to the end of the carousel.
     */
    addComponent(component) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (component.ptr == 0) {
            throw "component is disposed";
        }
        wasm.CarouselComponent_add_component(this.ptr, component.ptr);
        component.ptr = 0;
    }
    /**
     * Sets the size override of the carousel. 0xFFFFFFFF means automatic
     * sizing.
     */
    setSize(size) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.CarouselComponent_set_size(this.ptr, size);
    }
}
/**
 * A Carousel Component cycles through its child components one at a time,
 * periodically switching to the next child after a configurable interval.
 */
export class CarouselComponent extends CarouselComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.CarouselComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new empty Carousel Component.
     */
    static new() {
        const result = new CarouselComponent(wasm.CarouselComponent_new());
        return result;
    }
    /**
     * Converts the Carousel Component into a generic component suitable for using
     * with a layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.CarouselComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class CarouselComponentStateRef {
    ptr;
    /**
     * Returns the number of components in a Carousel State.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponentState_len(this.ptr);
        return result;
    }
    /**
     * Returns a string describing the type of the component at the specified
     * index within a Carousel State.
     */
    componentType(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponentState_component_type(this.ptr, index);
        return decodeString(result);
    }
    /**
     * Returns the size override of a Carousel State. 0xFFFFFFFF means automatic
     * sizing.
     */
    size() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponentState_size(this.ptr);
        return result;
    }
    /**
     * Returns the index of the currently visible component.
     */
    currentIndex() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.CarouselComponentState_current_index(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class CarouselComponentStateRefMut extends CarouselComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class CarouselComponentState extends CarouselComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * A Component provides information about a run in a way that is easy to
 * visualize. This type can store any of the components provided by this crate.
 */
export class ComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Component provides information about a run in a way that is easy to
 * visualize. This type can store any of the components provided by this crate.
 */
export class ComponentRefMut extends ComponentRef {
}
/**
 * A Component provides information about a run in a way that is easy to
 * visualize. This type can store any of the components provided by this crate.
 */
export class Component extends ComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.Component_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Current Comparison Component is a component that shows the name of the
 * comparison that is currently selected to be compared against.
 */
export class CurrentComparisonComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Current Comparison Component is a component that shows the name of the
 * comparison that is currently selected to be compared against.
 */
export class CurrentComparisonComponentRefMut extends CurrentComparisonComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.CurrentComparisonComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.CurrentComparisonComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
}
/**
 * The Current Comparison Component is a component that shows the name of the
 * comparison that is currently selected to be compared against.
 */
export class CurrentComparisonComponent extends CurrentComparisonComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.CurrentComparisonComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Current Comparison Component.
     */
    static new() {
        const result = new CurrentComparisonComponent(wasm.CurrentComparisonComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.CurrentComparisonComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Current Pace Component is a component that shows a prediction of the
 * current attempt's final time, if the current attempt's pace matches the
 * chosen comparison for the remainder of the run.
 */
export class CurrentPaceComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Current Pace Component is a component that shows a prediction of the
 * current attempt's final time, if the current attempt's pace matches the
 * chosen comparison for the remainder of the run.
 */
export class CurrentPaceComponentRefMut extends CurrentPaceComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.CurrentPaceComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.CurrentPaceComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
}
/**
 * The Current Pace Component is a component that shows a prediction of the
 * current attempt's final time, if the current attempt's pace matches the
 * chosen comparison for the remainder of the run.
 */
export class CurrentPaceComponent extends CurrentPaceComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.CurrentPaceComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Current Pace Component.
     */
    static new() {
        const result = new CurrentPaceComponent(wasm.CurrentPaceComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.CurrentPaceComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Delta Component is a component that shows how far ahead or behind the
 * current attempt is compared to the chosen comparison.
 */
export class DeltaComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Delta Component is a component that shows how far ahead or behind the
 * current attempt is compared to the chosen comparison.
 */
export class DeltaComponentRefMut extends DeltaComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = wasm.DeltaComponent_state_as_json(this.ptr, timer.ptr, layoutSettings.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer and the layout
     * settings provided.
     */
    state(timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = new KeyValueComponentState(wasm.DeltaComponent_state(this.ptr, timer.ptr, layoutSettings.ptr, lang));
        return result;
    }
}
/**
 * The Delta Component is a component that shows how far ahead or behind the
 * current attempt is compared to the chosen comparison.
 */
export class DeltaComponent extends DeltaComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.DeltaComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Delta Component.
     */
    static new() {
        const result = new DeltaComponent(wasm.DeltaComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.DeltaComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Detailed Timer Component is a component that shows two timers, one for
 * the total time of the current attempt and one showing the time of just the
 * current segment. Other information, like segment times of up to two
 * comparisons, the segment icon, and the segment's name, can also be shown.
 */
export class DetailedTimerComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Detailed Timer Component is a component that shows two timers, one for
 * the total time of the current attempt and one showing the time of just the
 * current segment. Other information, like segment times of up to two
 * comparisons, the segment icon, and the segment's name, can also be shown.
 */
export class DetailedTimerComponentRefMut extends DetailedTimerComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(imageCache, timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = wasm.DetailedTimerComponent_state_as_json(this.ptr, imageCache.ptr, timer.ptr, layoutSettings.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer and layout settings
     * provided.
     */
    state(imageCache, timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = new DetailedTimerComponentState(wasm.DetailedTimerComponent_state(this.ptr, imageCache.ptr, timer.ptr, layoutSettings.ptr, lang));
        return result;
    }
}
/**
 * The Detailed Timer Component is a component that shows two timers, one for
 * the total time of the current attempt and one showing the time of just the
 * current segment. Other information, like segment times of up to two
 * comparisons, the segment icon, and the segment's name, can also be shown.
 */
export class DetailedTimerComponent extends DetailedTimerComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.DetailedTimerComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Detailed Timer Component.
     */
    static new() {
        const result = new DetailedTimerComponent(wasm.DetailedTimerComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.DetailedTimerComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class DetailedTimerComponentStateRef {
    ptr;
    /**
     * The time shown by the component's main timer without the fractional part.
     */
    timerTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_timer_time(this.ptr);
        return decodeString(result);
    }
    /**
     * The fractional part of the time shown by the main timer (including the dot).
     */
    timerFraction() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_timer_fraction(this.ptr);
        return decodeString(result);
    }
    /**
     * The semantic coloring information the main timer's time carries.
     */
    timerSemanticColor() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_timer_semantic_color(this.ptr);
        return decodeString(result);
    }
    /**
     * The time shown by the component's segment timer without the fractional part.
     */
    segmentTimerTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_segment_timer_time(this.ptr);
        return decodeString(result);
    }
    /**
     * The fractional part of the time shown by the segment timer (including the
     * dot).
     */
    segmentTimerFraction() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_segment_timer_fraction(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns whether the first comparison is visible.
     */
    comparison1Visible() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_comparison1_visible(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the name of the first comparison. You may not call this if the first
     * comparison is not visible.
     */
    comparison1Name() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_comparison1_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns the time of the first comparison. You may not call this if the first
     * comparison is not visible.
     */
    comparison1Time() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_comparison1_time(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns whether the second comparison is visible.
     */
    comparison2Visible() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_comparison2_visible(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the name of the second comparison. You may not call this if the
     * second comparison is not visible.
     */
    comparison2Name() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_comparison2_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns the time of the second comparison. You may not call this if the
     * second comparison is not visible.
     */
    comparison2Time() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_comparison2_time(this.ptr);
        return decodeString(result);
    }
    /**
     * The icon of the segment. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_icon(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns how the segment icon is displayed.
     */
    displayIcon() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_display_icon(this.ptr);
        return decodeString(result);
    }
    /**
     * The name of the segment. This may be null if it's not supposed to be
     * visualized.
     */
    segmentName() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.DetailedTimerComponentState_segment_name(this.ptr);
        if (result == 0) {
            return null;
        }
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class DetailedTimerComponentStateRefMut extends DetailedTimerComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class DetailedTimerComponentState extends DetailedTimerComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.DetailedTimerComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * With a Fuzzy List, you can implement a fuzzy searching algorithm. The list
 * stores all the items that can be searched for. With the `search` method you
 * can then execute the actual fuzzy search which returns a list of all the
 * elements found. This can be used to implement searching in a list of games.
 */
export class FuzzyListRef {
    ptr;
    /**
     * Searches for the pattern provided in the list. A list of all the
     * matching elements is returned. The returned list has a maximum amount of
     * elements provided to this method.
     */
    search(pattern, max) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const pattern_allocated = allocString(pattern);
        const result = wasm.FuzzyList_search(this.ptr, pattern_allocated.ptr, max);
        dealloc(pattern_allocated);
        return JSON.parse(decodeString(result));
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * With a Fuzzy List, you can implement a fuzzy searching algorithm. The list
 * stores all the items that can be searched for. With the `search` method you
 * can then execute the actual fuzzy search which returns a list of all the
 * elements found. This can be used to implement searching in a list of games.
 */
export class FuzzyListRefMut extends FuzzyListRef {
    /**
     * Adds a new element to the list.
     */
    push(text) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const text_allocated = allocString(text);
        wasm.FuzzyList_push(this.ptr, text_allocated.ptr);
        dealloc(text_allocated);
    }
}
/**
 * With a Fuzzy List, you can implement a fuzzy searching algorithm. The list
 * stores all the items that can be searched for. With the `search` method you
 * can then execute the actual fuzzy search which returns a list of all the
 * elements found. This can be used to implement searching in a list of games.
 */
export class FuzzyList extends FuzzyListRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.FuzzyList_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Fuzzy List.
     */
    static new() {
        const result = new FuzzyList(wasm.FuzzyList_new());
        return result;
    }
}
/**
 * The general settings of the layout that apply to all components.
 */
export class GeneralLayoutSettingsRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The general settings of the layout that apply to all components.
 */
export class GeneralLayoutSettingsRefMut extends GeneralLayoutSettingsRef {
}
/**
 * The general settings of the layout that apply to all components.
 */
export class GeneralLayoutSettings extends GeneralLayoutSettingsRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.GeneralLayoutSettings_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a default general layout settings configuration.
     */
    static default() {
        const result = new GeneralLayoutSettings(wasm.GeneralLayoutSettings_default());
        return result;
    }
}
/**
 * The Graph Component visualizes how far the current attempt has been ahead or
 * behind the chosen comparison throughout the whole attempt. All the
 * individual deltas are shown as points in a graph.
 */
export class GraphComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, layoutSettings) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = wasm.GraphComponent_state_as_json(this.ptr, timer.ptr, layoutSettings.ptr);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer and layout settings
     * provided.
     */
    state(timer, layoutSettings) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = new GraphComponentState(wasm.GraphComponent_state(this.ptr, timer.ptr, layoutSettings.ptr));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Graph Component visualizes how far the current attempt has been ahead or
 * behind the chosen comparison throughout the whole attempt. All the
 * individual deltas are shown as points in a graph.
 */
export class GraphComponentRefMut extends GraphComponentRef {
}
/**
 * The Graph Component visualizes how far the current attempt has been ahead or
 * behind the chosen comparison throughout the whole attempt. All the
 * individual deltas are shown as points in a graph.
 */
export class GraphComponent extends GraphComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.GraphComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Graph Component.
     */
    static new() {
        const result = new GraphComponent(wasm.GraphComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.GraphComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export class GraphComponentStateRef {
    ptr;
    /**
     * Returns the amount of points to visualize. Connect all of them to visualize
     * the graph. If the live delta is active, the last point is to be interpreted
     * as a preview of the next split that is about to happen. Use the partial fill
     * color to visualize the region beneath that graph segment.
     */
    pointsLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_points_len(this.ptr);
        return result;
    }
    /**
     * Returns the x coordinate of the point specified. You may not provide an out
     * of bounds index.
     */
    pointX(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_point_x(this.ptr, index);
        return result;
    }
    /**
     * Returns the y coordinate of the point specified. You may not provide an out
     * of bounds index.
     */
    pointY(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_point_y(this.ptr, index);
        return result;
    }
    /**
     * Describes whether the segment the point specified is visualizing achieved a
     * new best segment time. Use the best segment color for it, in that case. You
     * may not provide an out of bounds index.
     */
    pointIsBestSegment(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_point_is_best_segment(this.ptr, index) != 0;
        return result;
    }
    /**
     * Describes how many horizontal grid lines to visualize.
     */
    horizontalGridLinesLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_horizontal_grid_lines_len(this.ptr);
        return result;
    }
    /**
     * Accesses the y coordinate of the horizontal grid line specified. You may not
     * provide an out of bounds index.
     */
    horizontalGridLine(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_horizontal_grid_line(this.ptr, index);
        return result;
    }
    /**
     * Describes how many vertical grid lines to visualize.
     */
    verticalGridLinesLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_vertical_grid_lines_len(this.ptr);
        return result;
    }
    /**
     * Accesses the x coordinate of the vertical grid line specified. You may not
     * provide an out of bounds index.
     */
    verticalGridLine(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_vertical_grid_line(this.ptr, index);
        return result;
    }
    /**
     * The y coordinate that separates the region that shows the times that are
     * ahead of the comparison and those that are behind.
     */
    middle() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_middle(this.ptr);
        return result;
    }
    /**
     * If the live delta is active, the last point is to be interpreted as a
     * preview of the next split that is about to happen. Use the partial fill
     * color to visualize the region beneath that graph segment.
     */
    isLiveDeltaActive() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_is_live_delta_active(this.ptr) != 0;
        return result;
    }
    /**
     * Describes whether the graph is flipped vertically. For visualizing the
     * graph, this usually doesn't need to be interpreted, as this information is
     * entirely encoded into the other variables.
     */
    isFlipped() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GraphComponentState_is_flipped(this.ptr) != 0;
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export class GraphComponentStateRefMut extends GraphComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export class GraphComponentState extends GraphComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.GraphComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A Component Group groups multiple components together and lays them out
 * in the opposite direction to the parent, enabling nested layout hierarchies.
 */
export class GroupComponentRef {
    ptr;
    /**
     * Returns the number of components in the group.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GroupComponent_len(this.ptr);
        return result;
    }
    /**
     * Returns the size override of the group. In horizontal mode this is the
     * height, in vertical mode it is the width. 0xFFFFFFFF means automatic sizing.
     */
    size() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GroupComponent_size(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Component Group groups multiple components together and lays them out
 * in the opposite direction to the parent, enabling nested layout hierarchies.
 */
export class GroupComponentRefMut extends GroupComponentRef {
    /**
     * Adds a component to the end of the group.
     */
    addComponent(component) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (component.ptr == 0) {
            throw "component is disposed";
        }
        wasm.GroupComponent_add_component(this.ptr, component.ptr);
        component.ptr = 0;
    }
    /**
     * Sets the size override of the group. In horizontal mode this sets the
     * height, in vertical mode it sets the width. 0xFFFFFFFF means automatic
     * sizing.
     */
    setSize(size) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.GroupComponent_set_size(this.ptr, size);
    }
}
/**
 * A Component Group groups multiple components together and lays them out
 * in the opposite direction to the parent, enabling nested layout hierarchies.
 */
export class GroupComponent extends GroupComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.GroupComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new empty Group Component.
     */
    static new() {
        const result = new GroupComponent(wasm.GroupComponent_new());
        return result;
    }
    /**
     * Converts the Group Component into a generic component suitable for using
     * with a layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.GroupComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class GroupComponentStateRef {
    ptr;
    /**
     * Returns the number of components in a Group State.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GroupComponentState_len(this.ptr);
        return result;
    }
    /**
     * Returns a string describing the type of the component at the specified
     * index within a Group State.
     */
    componentType(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GroupComponentState_component_type(this.ptr, index);
        return decodeString(result);
    }
    /**
     * Returns the size override of a Group State. In horizontal mode this is the
     * height, in vertical mode it is the width. 0xFFFFFFFF means automatic
     * sizing.
     */
    size() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.GroupComponentState_size(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class GroupComponentStateRefMut extends GroupComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class GroupComponentState extends GroupComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * A cache for images that allows looking up images by their ID. The cache uses
 * a garbage collection algorithm to remove images that have not been visited
 * since the last garbage collection. Functions updating the cache usually
 * don't run the garbage collection themselves, so make sure to call `collect`
 * every now and then to remove unvisited images.
 */
export class ImageCacheRef {
    ptr;
    /**
     * Looks up an image in the cache based on its image ID and returns a pointer
     * to the bytes that make up the image. The bytes are the image in its original
     * file format. The format is not specified and can be any image format. The
     * data may not even represent a valid image at all. If the image is not in the
     * cache, null is returned. This does not mark the image as visited.
     */
    lookupDataPtr(key) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const key_allocated = allocString(key);
        const result = wasm.ImageCache_lookup_data_ptr(this.ptr, key_allocated.ptr);
        dealloc(key_allocated);
        return result;
    }
    /**
     * Looks up an image in the cache based on its image ID and returns its byte
     * length. If the image is not in the cache, 0 is returned. This does not mark
     * the image as visited.
     */
    lookupDataLen(key) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const key_allocated = allocString(key);
        const result = wasm.ImageCache_lookup_data_len(this.ptr, key_allocated.ptr);
        dealloc(key_allocated);
        return result;
    }
    /**
     * Looks up an image in the cache based on its image ID. The bytes are the image in its original
     * file format. The format is not specified and can be any image format. The
     * data may not even represent a valid image at all. If the image is not in the
     * cache, null is returned. This does not mark the image as visited.
     */
    lookupData(key) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const key_allocated = allocString(key);
        const ptr = wasm.ImageCache_lookup_data_ptr(this.ptr, key_allocated.ptr);
        const len = wasm.ImageCache_lookup_data_len(this.ptr, key_allocated.ptr);
        dealloc(key_allocated);
        if (ptr === 0) {
            return undefined;
        }
        return decodePtrLen(ptr, len);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A cache for images that allows looking up images by their ID. The cache uses
 * a garbage collection algorithm to remove images that have not been visited
 * since the last garbage collection. Functions updating the cache usually
 * don't run the garbage collection themselves, so make sure to call `collect`
 * every now and then to remove unvisited images.
 */
export class ImageCacheRefMut extends ImageCacheRef {
    /**
     * Caches an image and returns its image ID. The image is provided as a byte
     * array. The image ID is the hash of the image data and can be used to look up
     * the image in the cache. The image is marked as visited in the cache. If you
     * specify that the image is large, it gets considered a large image that may
     * be used as a background image. Otherwise it gets considered an icon. The
     * image is resized according to this information.
     */
    cache(data, len, isLarge) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.ImageCache_cache(this.ptr, data, len, isLarge ? 1 : 0);
        return decodeString(result);
    }
    /**
     * Runs the garbage collection of the cache. This removes images from the cache
     * that have not been visited since the last garbage collection. Not every
     * image that has not been visited is removed. There is a heuristic that keeps
     * a certain amount of images in the cache regardless of whether they have been
     * visited or not. Returns the amount of images that got collected.
     */
    collect() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.ImageCache_collect(this.ptr);
        return result;
    }
    cacheFromArray(data, isLarge) {
        const slice = allocUint8Array(data);
        const result = this.cache(slice.ptr, slice.len, isLarge);
        dealloc(slice);
        return result;
    }
}
/**
 * A cache for images that allows looking up images by their ID. The cache uses
 * a garbage collection algorithm to remove images that have not been visited
 * since the last garbage collection. Functions updating the cache usually
 * don't run the garbage collection themselves, so make sure to call `collect`
 * every now and then to remove unvisited images.
 */
export class ImageCache extends ImageCacheRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.ImageCache_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new image cache.
     */
    static new() {
        const result = new ImageCache(wasm.ImageCache_new());
        return result;
    }
}
/**
 * The state object describes the information to visualize for a key value based component.
 */
export class KeyValueComponentStateRef {
    ptr;
    /**
     * The key to visualize.
     */
    key() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.KeyValueComponentState_key(this.ptr);
        return decodeString(result);
    }
    /**
     * The value to visualize.
     */
    value() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.KeyValueComponentState_value(this.ptr);
        return decodeString(result);
    }
    /**
     * The semantic coloring information the value carries.
     */
    semanticColor() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.KeyValueComponentState_semantic_color(this.ptr);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for a key value based component.
 */
export class KeyValueComponentStateRefMut extends KeyValueComponentStateRef {
}
/**
 * The state object describes the information to visualize for a key value based component.
 */
export class KeyValueComponentState extends KeyValueComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.KeyValueComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * Localization bindings.
 */
export class LangRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * Localization bindings.
 */
export class LangRefMut extends LangRef {
}
/**
 * Localization bindings.
 */
export class Lang extends LangRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
    /**
     * Parses a locale string into a language.
     */
    static parseLocale(locale) {
        const locale_allocated = allocString(locale);
        const result = wasm.Lang_parse_locale(locale_allocated.ptr);
        dealloc(locale_allocated);
        return result;
    }
    /**
     * Parses a language name into a language.
     */
    static fromName(name) {
        const name_allocated = allocString(name);
        const result = wasm.Lang_from_name(name_allocated.ptr);
        dealloc(name_allocated);
        return result;
    }
    /**
     * Returns the localized display name for a language.
     */
    static displayName(lang) {
        const result = wasm.Lang_name(lang);
        return decodeString(result);
    }
}
/**
 * A Layout allows you to combine multiple components together to visualize a
 * variety of information the runner is interested in.
 */
export class LayoutRef {
    ptr;
    /**
     * Clones the layout.
     */
    clone() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Layout(wasm.Layout_clone(this.ptr));
        return result;
    }
    /**
     * Encodes the settings of the layout as JSON.
     */
    settingsAsJson() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Layout_settings_as_json(this.ptr);
        return JSON.parse(decodeString(result));
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Layout allows you to combine multiple components together to visualize a
 * variety of information the runner is interested in.
 */
export class LayoutRefMut extends LayoutRef {
    /**
     * Calculates and returns the layout's state based on the timer provided.
     */
    state(imageCache, timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new LayoutState(wasm.Layout_state(this.ptr, imageCache.ptr, timer.ptr, lang));
        return result;
    }
    /**
     * Updates the layout's state based on the timer provided.
     */
    updateState(state, imageCache, timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (state.ptr == 0) {
            throw "state is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        wasm.Layout_update_state(this.ptr, state.ptr, imageCache.ptr, timer.ptr, lang);
    }
    /**
     * Updates the layout's state based on the timer provided and encodes it as
     * JSON.
     */
    updateStateAsJson(state, imageCache, timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (state.ptr == 0) {
            throw "state is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.Layout_update_state_as_json(this.ptr, state.ptr, imageCache.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the layout's state based on the timer provided and encodes it as
     * JSON. You can use this to visualize all of the components of a layout.
     */
    stateAsJson(imageCache, timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.Layout_state_as_json(this.ptr, imageCache.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Adds a new component to the end of the layout.
     */
    push(component) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (component.ptr == 0) {
            throw "component is disposed";
        }
        wasm.Layout_push(this.ptr, component.ptr);
        component.ptr = 0;
    }
    /**
     * Scrolls up all the components in the layout that can be scrolled up.
     */
    scrollUp() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Layout_scroll_up(this.ptr);
    }
    /**
     * Scrolls down all the components in the layout that can be scrolled down.
     */
    scrollDown() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Layout_scroll_down(this.ptr);
    }
}
/**
 * A Layout allows you to combine multiple components together to visualize a
 * variety of information the runner is interested in.
 */
export class Layout extends LayoutRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.Layout_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new empty layout with no components.
     */
    static new() {
        const result = new Layout(wasm.Layout_new());
        return result;
    }
    /**
     * Creates a new default layout that contains a default set of components
     * in order to provide a good default layout for runners. Which components
     * are provided by this and how they are configured may change in the
     * future.
     */
    static defaultLayout(lang) {
        const result = new Layout(wasm.Layout_default_layout(lang));
        return result;
    }
    /**
     * Parses a layout from the given JSON description of its settings. null is
     * returned if it couldn't be parsed.
     */
    static parseJson(settings) {
        const settings_allocated = allocString(JSON.stringify(settings));
        const result = new Layout(wasm.Layout_parse_json(settings_allocated.ptr));
        dealloc(settings_allocated);
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Parses a layout saved by the original LiveSplit. This is lossy, as not
     * everything can be converted completely. null is returned if it couldn't be
     * parsed at all.
     */
    static parseOriginalLivesplit(data, length) {
        const result = new Layout(wasm.Layout_parse_original_livesplit(data, length));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    static parseOriginalLivesplitArray(data) {
        const slice = allocUint8Array(data);
        const result = Layout.parseOriginalLivesplit(slice.ptr, slice.len);
        dealloc(slice);
        return result;
    }
    static parseOriginalLivesplitString(text) {
        const slice = allocString(text);
        const result = Layout.parseOriginalLivesplit(slice.ptr, slice.len);
        dealloc(slice);
        return result;
    }
}
/**
 * The state object describes the information to visualize for an entire
 * layout. Use this with care, as invalid usage will result in a panic.
 *
 * Specifically, you should avoid doing the following:
 *
 * - Using out of bounds indices.
 * - Using the wrong getter function on the wrong type of component.
 */
export class LayoutStateRef {
    ptr;
    /**
     * Encodes the layout state as JSON. You can use this to visualize all of the
     * components of a layout.
     */
    asJson() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.LayoutState_as_json(this.ptr);
        return JSON.parse(decodeString(result));
    }
    /**
     * Gets the number of Components in the Layout State.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.LayoutState_len(this.ptr);
        return result;
    }
    /**
     * Returns a string describing the type of the Component at the specified
     * index.
     */
    componentType(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.LayoutState_component_type(this.ptr, index);
        return decodeString(result);
    }
    /**
     * Gets the Blank Space component state at the specified index.
     */
    componentAsBlankSpace(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new BlankSpaceComponentStateRef(wasm.LayoutState_component_as_blank_space(this.ptr, index));
        return result;
    }
    /**
     * Gets the Detailed Timer component state at the specified index.
     */
    componentAsDetailedTimer(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new DetailedTimerComponentStateRef(wasm.LayoutState_component_as_detailed_timer(this.ptr, index));
        return result;
    }
    /**
     * Gets the Graph component state at the specified index.
     */
    componentAsGraph(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new GraphComponentStateRef(wasm.LayoutState_component_as_graph(this.ptr, index));
        return result;
    }
    /**
     * Gets the Key Value component state at the specified index.
     */
    componentAsKeyValue(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new KeyValueComponentStateRef(wasm.LayoutState_component_as_key_value(this.ptr, index));
        return result;
    }
    /**
     * Gets the Separator component state at the specified index.
     */
    componentAsSeparator(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SeparatorComponentStateRef(wasm.LayoutState_component_as_separator(this.ptr, index));
        return result;
    }
    /**
     * Gets the Splits component state at the specified index.
     */
    componentAsSplits(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SplitsComponentStateRef(wasm.LayoutState_component_as_splits(this.ptr, index));
        return result;
    }
    /**
     * Gets the Text component state at the specified index.
     */
    componentAsText(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TextComponentStateRef(wasm.LayoutState_component_as_text(this.ptr, index));
        return result;
    }
    /**
     * Gets the Timer component state at the specified index.
     */
    componentAsTimer(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimerComponentStateRef(wasm.LayoutState_component_as_timer(this.ptr, index));
        return result;
    }
    /**
     * Gets the Title component state at the specified index.
     */
    componentAsTitle(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TitleComponentStateRef(wasm.LayoutState_component_as_title(this.ptr, index));
        return result;
    }
    /**
     * Gets the Group component state at the specified index.
     */
    componentAsGroup(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new GroupComponentStateRef(wasm.LayoutState_component_as_group(this.ptr, index));
        return result;
    }
    /**
     * Gets the Carousel component state at the specified index.
     */
    componentAsCarousel(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new CarouselComponentStateRef(wasm.LayoutState_component_as_carousel(this.ptr, index));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for an entire
 * layout. Use this with care, as invalid usage will result in a panic.
 *
 * Specifically, you should avoid doing the following:
 *
 * - Using out of bounds indices.
 * - Using the wrong getter function on the wrong type of component.
 */
export class LayoutStateRefMut extends LayoutStateRef {
}
/**
 * The state object describes the information to visualize for an entire
 * layout. Use this with care, as invalid usage will result in a panic.
 *
 * Specifically, you should avoid doing the following:
 *
 * - Using out of bounds indices.
 * - Using the wrong getter function on the wrong type of component.
 */
export class LayoutState extends LayoutStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.LayoutState_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new empty Layout State. This is useful for creating an empty
     * layout state that gets updated over time.
     */
    static new() {
        const result = new LayoutState(wasm.LayoutState_new());
        return result;
    }
}
/**
 * A Linked Layout associates a Layout with a Run. If the Run has a Linked
 * Layout, it is supposed to be visualized with the Layout that is linked with
 * it.
 */
export class LinkedLayoutRef {
    ptr;
    /**
     * Checks whether the linked layout is the default layout.
     */
    isDefault() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.LinkedLayout_is_default(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the path of the linked layout, if it's not the default layout.
     */
    path() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.LinkedLayout_path(this.ptr);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Linked Layout associates a Layout with a Run. If the Run has a Linked
 * Layout, it is supposed to be visualized with the Layout that is linked with
 * it.
 */
export class LinkedLayoutRefMut extends LinkedLayoutRef {
}
/**
 * A Linked Layout associates a Layout with a Run. If the Run has a Linked
 * Layout, it is supposed to be visualized with the Layout that is linked with
 * it.
 */
export class LinkedLayout extends LinkedLayoutRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.LinkedLayout_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Linked Layout with the path specified. If the path is empty,
     * the default layout is used instead.
     */
    static new(path) {
        const path_allocated = allocString(path);
        const result = new LinkedLayout(wasm.LinkedLayout_new(path_allocated.ptr));
        dealloc(path_allocated);
        return result;
    }
}
/**
 * A run parsed by the Composite Parser. This contains the Run itself and
 * information about which parser parsed it.
 */
export class ParseRunResultRef {
    ptr;
    /**
     * Returns true if the Run got parsed successfully. false is returned otherwise.
     */
    parsedSuccessfully() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.ParseRunResult_parsed_successfully(this.ptr) != 0;
        return result;
    }
    /**
     * Accesses the name of the Parser that parsed the Run. You may not call this
     * if the Run wasn't parsed successfully.
     */
    timerKind() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.ParseRunResult_timer_kind(this.ptr);
        return decodeString(result);
    }
    /**
     * Checks whether the Parser parsed a generic timer. Since a generic timer can
     * have any name, it may clash with the specific timer formats that
     * livesplit-core supports. With this function you can determine if a generic
     * timer format was parsed, instead of one of the more specific timer formats.
     */
    isGenericTimer() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.ParseRunResult_is_generic_timer(this.ptr) != 0;
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A run parsed by the Composite Parser. This contains the Run itself and
 * information about which parser parsed it.
 */
export class ParseRunResultRefMut extends ParseRunResultRef {
}
/**
 * A run parsed by the Composite Parser. This contains the Run itself and
 * information about which parser parsed it.
 */
export class ParseRunResult extends ParseRunResultRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.ParseRunResult_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Moves the actual Run object out of the Result. You may not call this if the
     * Run wasn't parsed successfully.
     */
    unwrap() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Run(wasm.ParseRunResult_unwrap(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The PB Chance Component is a component that shows how likely it is to beat
 * the Personal Best. If there is no active attempt it shows the general chance
 * of beating the Personal Best. During an attempt it actively changes based on
 * how well the attempt is going.
 */
export class PbChanceComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.PbChanceComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.PbChanceComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The PB Chance Component is a component that shows how likely it is to beat
 * the Personal Best. If there is no active attempt it shows the general chance
 * of beating the Personal Best. During an attempt it actively changes based on
 * how well the attempt is going.
 */
export class PbChanceComponentRefMut extends PbChanceComponentRef {
}
/**
 * The PB Chance Component is a component that shows how likely it is to beat
 * the Personal Best. If there is no active attempt it shows the general chance
 * of beating the Personal Best. During an attempt it actively changes based on
 * how well the attempt is going.
 */
export class PbChanceComponent extends PbChanceComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.PbChanceComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new PB Chance Component.
     */
    static new() {
        const result = new PbChanceComponent(wasm.PbChanceComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.PbChanceComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Possible Time Save Component is a component that shows how much time the
 * chosen comparison could've saved for the current segment, based on the Best
 * Segments. This component also allows showing the Total Possible Time Save
 * for the remainder of the current attempt.
 */
export class PossibleTimeSaveComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.PossibleTimeSaveComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.PossibleTimeSaveComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Possible Time Save Component is a component that shows how much time the
 * chosen comparison could've saved for the current segment, based on the Best
 * Segments. This component also allows showing the Total Possible Time Save
 * for the remainder of the current attempt.
 */
export class PossibleTimeSaveComponentRefMut extends PossibleTimeSaveComponentRef {
}
/**
 * The Possible Time Save Component is a component that shows how much time the
 * chosen comparison could've saved for the current segment, based on the Best
 * Segments. This component also allows showing the Total Possible Time Save
 * for the remainder of the current attempt.
 */
export class PossibleTimeSaveComponent extends PossibleTimeSaveComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.PossibleTimeSaveComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Possible Time Save Component.
     */
    static new() {
        const result = new PossibleTimeSaveComponent(wasm.PossibleTimeSaveComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.PossibleTimeSaveComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * Describes a potential clean up that could be applied. You can query a
 * message describing the details of this potential clean up. A potential clean
 * up can then be turned into an actual clean up in order to apply it to the
 * Run.
 */
export class PotentialCleanUpRef {
    ptr;
    /**
     * Accesses the message describing the potential clean up that can be applied
     * to a Run.
     */
    message() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.PotentialCleanUp_message(this.ptr);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * Describes a potential clean up that could be applied. You can query a
 * message describing the details of this potential clean up. A potential clean
 * up can then be turned into an actual clean up in order to apply it to the
 * Run.
 */
export class PotentialCleanUpRefMut extends PotentialCleanUpRef {
}
/**
 * Describes a potential clean up that could be applied. You can query a
 * message describing the details of this potential clean up. A potential clean
 * up can then be turned into an actual clean up in order to apply it to the
 * Run.
 */
export class PotentialCleanUp extends PotentialCleanUpRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.PotentialCleanUp_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Previous Segment Component is a component that shows how much time was
 * saved or lost during the previous segment based on the chosen comparison.
 * Additionally, the potential time save for the previous segment can be
 * displayed. This component switches to a `Live Segment` view that shows
 * active time loss whenever the runner is losing time on the current segment.
 */
export class PreviousSegmentComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = wasm.PreviousSegmentComponent_state_as_json(this.ptr, timer.ptr, layoutSettings.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer and the layout
     * settings provided.
     */
    state(timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = new KeyValueComponentState(wasm.PreviousSegmentComponent_state(this.ptr, timer.ptr, layoutSettings.ptr, lang));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Previous Segment Component is a component that shows how much time was
 * saved or lost during the previous segment based on the chosen comparison.
 * Additionally, the potential time save for the previous segment can be
 * displayed. This component switches to a `Live Segment` view that shows
 * active time loss whenever the runner is losing time on the current segment.
 */
export class PreviousSegmentComponentRefMut extends PreviousSegmentComponentRef {
}
/**
 * The Previous Segment Component is a component that shows how much time was
 * saved or lost during the previous segment based on the chosen comparison.
 * Additionally, the potential time save for the previous segment can be
 * displayed. This component switches to a `Live Segment` view that shows
 * active time loss whenever the runner is losing time on the current segment.
 */
export class PreviousSegmentComponent extends PreviousSegmentComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.PreviousSegmentComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Previous Segment Component.
     */
    static new() {
        const result = new PreviousSegmentComponent(wasm.PreviousSegmentComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.PreviousSegmentComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * A Run stores the split times for a specific game and category of a runner.
 */
export class RunRef {
    ptr;
    /**
     * Clones the Run object.
     */
    clone() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Run(wasm.Run_clone(this.ptr));
        return result;
    }
    /**
     * Accesses the name of the game this Run is for.
     */
    gameName() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_game_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the game icon's data. If there is no game icon, this returns an
     * empty buffer.
     */
    gameIconPtr() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_game_icon_ptr(this.ptr);
        return result;
    }
    /**
     * Accesses the amount of bytes the game icon's data takes up.
     */
    gameIconLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_game_icon_len(this.ptr);
        return result;
    }
    /**
     * Accesses the name of the category this Run is for.
     */
    categoryName() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_category_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns a file name (without the extension) suitable for this Run that
     * is built the following way:
     *
     * Game Name - Category Name
     *
     * If either is empty, the dash is omitted. Special characters that cause
     * problems in file names are also omitted. If an extended category name is
     * used, the variables of the category are appended in a parenthesis.
     */
    extendedFileName(useExtendedCategoryName) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_extended_file_name(this.ptr, useExtendedCategoryName ? 1 : 0);
        return decodeString(result);
    }
    /**
     * Returns a name suitable for this Run that is built the following way:
     *
     * Game Name - Category Name
     *
     * If either is empty, the dash is omitted. If an extended category name is
     * used, the variables of the category are appended in a parenthesis.
     */
    extendedName(useExtendedCategoryName) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_extended_name(this.ptr, useExtendedCategoryName ? 1 : 0);
        return decodeString(result);
    }
    /**
     * Returns an extended category name that possibly includes the region,
     * platform and variables, depending on the arguments provided. An extended
     * category name may look like this:
     *
     * Any% (No Tuner, JPN, Wii Emulator)
     */
    extendedCategoryName(showRegion, showPlatform, showVariables) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_extended_category_name(this.ptr, showRegion ? 1 : 0, showPlatform ? 1 : 0, showVariables ? 1 : 0);
        return decodeString(result);
    }
    /**
     * Returns the amount of runs that have been attempted with these splits.
     */
    attemptCount() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_attempt_count(this.ptr);
        return result;
    }
    /**
     * Accesses additional metadata of this Run, like the platform and region
     * of the game.
     */
    metadata() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new RunMetadataRef(wasm.Run_metadata(this.ptr));
        return result;
    }
    /**
     * Accesses the time an attempt of this Run should start at.
     */
    offset() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpanRef(wasm.Run_offset(this.ptr));
        return result;
    }
    /**
     * Returns the amount of segments stored in this Run.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_len(this.ptr);
        return result;
    }
    /**
     * Returns whether the Run has been modified and should be saved so that the
     * changes don't get lost.
     */
    hasBeenModified() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_has_been_modified(this.ptr) != 0;
        return result;
    }
    /**
     * Accesses a certain segment of this Run. You may not provide an out of bounds
     * index.
     */
    segment(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SegmentRef(wasm.Run_segment(this.ptr, index));
        return result;
    }
    /**
     * Returns the amount of native segment groups stored in this Run.
     */
    segmentGroupsLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_segment_groups_len(this.ptr);
        return result;
    }
    /**
     * Accesses a native segment group stored in this Run by its index. You may not
     * provide an out of bounds index.
     */
    segmentGroup(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SegmentGroupRef(wasm.Run_segment_group(this.ptr, index));
        return result;
    }
    /**
     * Returns the amount of segments in this Run.
     */
    segmentsLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_segments_len(this.ptr);
        return result;
    }
    /**
     * Returns the amount attempt history elements are stored in this Run.
     */
    attemptHistoryLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_attempt_history_len(this.ptr);
        return result;
    }
    /**
     * Accesses the an attempt history element by its index. This does not store
     * the actual segment times, just the overall attempt information. Information
     * about the individual segments is stored within each segment. You may not
     * provide an out of bounds index.
     */
    attemptHistoryIndex(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new AttemptRef(wasm.Run_attempt_history_index(this.ptr, index));
        return result;
    }
    /**
     * Saves a Run as a LiveSplit splits file (*.lss). If the run is actively in
     * use by a timer, use the appropriate method on the timer instead, in order to
     * properly save the current attempt as well.
     */
    saveAsLss() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_save_as_lss(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns the amount of custom comparisons stored in this Run.
     */
    customComparisonsLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_custom_comparisons_len(this.ptr);
        return result;
    }
    /**
     * Accesses a custom comparison stored in this Run by its index. This includes
     * `Personal Best` but excludes all the other Comparison Generators. You may
     * not provide an out of bounds index.
     */
    customComparison(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_custom_comparison(this.ptr, index);
        return decodeString(result);
    }
    /**
     * Returns the amount of total comparisons stored in this Run.
     */
    comparisonsLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_comparisons_len(this.ptr);
        return result;
    }
    /**
     * Accesses a comparison stored in this Run by its index. This includes both
     * custom comparisons as well as all the Comparison Generators. You may not
     * provide an out of bounds index.
     */
    comparison(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_comparison(this.ptr, index);
        return decodeString(result);
    }
    /**
     * Accesses the Auto Splitter Settings that are encoded as XML.
     */
    autoSplitterSettings() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_auto_splitter_settings(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the linked layout of this Run. If a Layout is linked, it is
     * supposed to be loaded to visualize the Run.
     */
    linkedLayout() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new LinkedLayout(wasm.Run_linked_layout(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    saveAsLssBytes() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Run_save_as_lss(this.ptr);
        return decodeSlice(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Run stores the split times for a specific game and category of a runner.
 */
export class RunRefMut extends RunRef {
    /**
     * Pushes the segment provided to the end of the list of segments of this Run.
     */
    pushSegment(segment) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (segment.ptr == 0) {
            throw "segment is disposed";
        }
        wasm.Run_push_segment(this.ptr, segment.ptr);
        segment.ptr = 0;
    }
    /**
     * Sets the name of the game this Run is for.
     */
    setGameName(game) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const game_allocated = allocString(game);
        wasm.Run_set_game_name(this.ptr, game_allocated.ptr);
        dealloc(game_allocated);
    }
    /**
     * Sets the name of the category this Run is for.
     */
    setCategoryName(category) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const category_allocated = allocString(category);
        wasm.Run_set_category_name(this.ptr, category_allocated.ptr);
        dealloc(category_allocated);
    }
    /**
     * Marks the Run as modified, so that it is known that there are changes
     * that should be saved.
     */
    markAsModified() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Run_mark_as_modified(this.ptr);
    }
}
/**
 * A Run stores the split times for a specific game and category of a runner.
 */
export class Run extends RunRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.Run_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Run object with no segments.
     */
    static new() {
        const result = new Run(wasm.Run_new());
        return result;
    }
    /**
     * Attempts to parse a splits file from an array by invoking the corresponding
     * parser for the file format detected. Additionally you can provide the path
     * of the splits file so additional files, like external images, can be loaded.
     * If you are using livesplit-core in a server-like environment, set this to
     * null. Only client-side applications should provide a path here. Unlike the
     * normal parsing function, it also fixes problems in the Run, such as
     * decreasing times and missing information.
     */
    static parse(data, length, loadFilesPath) {
        const loadFilesPath_allocated = allocString(loadFilesPath);
        const result = new ParseRunResult(wasm.Run_parse(data, length, loadFilesPath_allocated.ptr));
        dealloc(loadFilesPath_allocated);
        return result;
    }
    static parseArray(data, loadFilesPath) {
        const slice = allocUint8Array(data);
        const result = Run.parse(slice.ptr, slice.len, loadFilesPath);
        dealloc(slice);
        return result;
    }
    static parseString(text, loadFilesPath) {
        const slice = allocString(text);
        const result = Run.parse(slice.ptr, slice.len, loadFilesPath);
        dealloc(slice);
        return result;
    }
}
/**
 * The Run Editor allows modifying Runs while ensuring that all the different
 * invariants of the Run objects are upheld no matter what kind of operations
 * are being applied to the Run. It provides the current state of the editor as
 * state objects that can be visualized by any kind of User Interface.
 */
export class RunEditorRef {
    ptr;
    /**
     * Calculates the Run Editor's state and encodes it as
     * JSON in order to visualize it.
     */
    stateAsJson(imageCache, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        const result = wasm.RunEditor_state_as_json(this.ptr, imageCache.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Run Editor allows modifying Runs while ensuring that all the different
 * invariants of the Run objects are upheld no matter what kind of operations
 * are being applied to the Run. It provides the current state of the editor as
 * state objects that can be visualized by any kind of User Interface.
 */
export class RunEditorRefMut extends RunEditorRef {
    /**
     * Selects a different timing method for being modified.
     */
    selectTimingMethod(method) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_select_timing_method(this.ptr, method);
    }
    /**
     * Unselects the segment with the given index. If it's not selected or the
     * index is out of bounds, nothing happens. The segment is not unselected,
     * when it is the only segment that is selected. If the active segment is
     * unselected, the most recently selected segment remaining becomes the
     * active segment.
     */
    unselect(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_unselect(this.ptr, index);
    }
    /**
     * In addition to the segments that are already selected, the segment with
     * the given index is being selected. The segment chosen also becomes the
     * active segment.
     *
     * This panics if the index of the segment provided is out of bounds.
     */
    selectAdditionally(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_select_additionally(this.ptr, index);
    }
    /**
     * Selects all segments from the currently active segment to the segment with
     * the given index. The segment with the given index becomes the new active
     * segment.
     *
     * This panics if the index of the segment provided is out of bounds.
     */
    selectRange(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_select_range(this.ptr, index);
    }
    /**
     * Selects the segment with the given index. All other segments are
     * unselected. The segment chosen also becomes the active segment.
     *
     * This panics if the index of the segment provided is out of bounds.
     */
    selectOnly(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_select_only(this.ptr, index);
    }
    /**
     * Sets the name of the game.
     */
    setGameName(game) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const game_allocated = allocString(game);
        wasm.RunEditor_set_game_name(this.ptr, game_allocated.ptr);
        dealloc(game_allocated);
    }
    /**
     * Sets the name of the category.
     */
    setCategoryName(category) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const category_allocated = allocString(category);
        wasm.RunEditor_set_category_name(this.ptr, category_allocated.ptr);
        dealloc(category_allocated);
    }
    /**
     * Parses and sets the timer offset from the string provided. The timer
     * offset specifies the time, the timer starts at when starting a new
     * attempt.
     */
    parseAndSetOffset(offset, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const offset_allocated = allocString(offset);
        const result = wasm.RunEditor_parse_and_set_offset(this.ptr, offset_allocated.ptr, lang) != 0;
        dealloc(offset_allocated);
        return result;
    }
    /**
     * Parses and sets the attempt count from the string provided. Changing
     * this has no affect on the attempt history or the segment history. This
     * number is mostly just a visual number for the runner.
     */
    parseAndSetAttemptCount(attempts) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const attempts_allocated = allocString(attempts);
        const result = wasm.RunEditor_parse_and_set_attempt_count(this.ptr, attempts_allocated.ptr) != 0;
        dealloc(attempts_allocated);
        return result;
    }
    /**
     * Sets the game's icon.
     */
    setGameIcon(data, length) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_set_game_icon(this.ptr, data, length);
    }
    /**
     * Removes the game's icon.
     */
    removeGameIcon() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_remove_game_icon(this.ptr);
    }
    /**
     * Sets the Linked Layout of the Run. If a Layout is linked, it is supposed to
     * be loaded to visualize the Run.
     */
    setLinkedLayout(linkedLayout) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (linkedLayout.ptr == 0) {
            throw "linkedLayout is disposed";
        }
        wasm.RunEditor_set_linked_layout(this.ptr, linkedLayout.ptr);
        linkedLayout.ptr = 0;
    }
    /**
     * Removes the Linked Layout of the Run if there is one. If a Layout is linked,
     * it is supposed to be loaded to visualize the Run.
     */
    removeLinkedLayout() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_remove_linked_layout(this.ptr);
    }
    /**
     * Sets the speedrun.com Run ID of the run. You need to ensure that the
     * record on speedrun.com matches up with the Personal Best of this run.
     * This may be empty if there's no association.
     */
    setRunId(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_set_run_id(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Sets the name of the region this game is from. This may be empty if it's
     * not specified.
     */
    setRegionName(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_set_region_name(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Sets the name of the platform this game is run on. This may be empty if
     * it's not specified.
     */
    setPlatformName(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_set_platform_name(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Specifies whether this speedrun is done on an emulator. Keep in mind
     * that false may also mean that this information is simply not known.
     */
    setEmulatorUsage(usesEmulator) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_set_emulator_usage(this.ptr, usesEmulator ? 1 : 0);
    }
    /**
     * Sets the speedrun.com variable with the name specified to the value specified. A
     * variable is an arbitrary key value pair storing additional information
     * about the category. An example of this may be whether Amiibos are used
     * in this category. If the variable doesn't exist yet, it is being
     * inserted.
     */
    setSpeedrunComVariable(name, value) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        const value_allocated = allocString(value);
        wasm.RunEditor_set_speedrun_com_variable(this.ptr, name_allocated.ptr, value_allocated.ptr);
        dealloc(name_allocated);
        dealloc(value_allocated);
    }
    /**
     * Removes the speedrun.com variable with the name specified.
     */
    removeSpeedrunComVariable(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_remove_speedrun_com_variable(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Adds a new permanent custom variable. If there's a temporary variable with
     * the same name, it gets turned into a permanent variable and its value stays.
     * If a permanent variable with the name already exists, nothing happens.
     */
    addCustomVariable(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_add_custom_variable(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Sets the value of a custom variable with the name specified. If the custom
     * variable does not exist, or is not a permanent variable, nothing happens.
     */
    setCustomVariable(name, value) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        const value_allocated = allocString(value);
        wasm.RunEditor_set_custom_variable(this.ptr, name_allocated.ptr, value_allocated.ptr);
        dealloc(name_allocated);
        dealloc(value_allocated);
    }
    /**
     * Removes the custom variable with the name specified. If the custom variable
     * does not exist, or is not a permanent variable, nothing happens.
     */
    removeCustomVariable(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_remove_custom_variable(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Resets all the Metadata Information.
     */
    clearMetadata() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_clear_metadata(this.ptr);
    }
    /**
     * Inserts a new empty segment above all selected segments and adjusts the
     * Run's history information accordingly. The newly created segment is then
     * the only selected segment and also the active segment.
     */
    insertSegmentAbove() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_insert_segment_above(this.ptr);
    }
    /**
     * Inserts a new empty segment below all selected segments and adjusts the
     * Run's history information accordingly. The newly created segment is then
     * the only selected segment and also the active segment.
     */
    insertSegmentBelow() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_insert_segment_below(this.ptr);
    }
    /**
     * Removes all the selected segments, unless all of them are selected. The
     * run's information is automatically adjusted properly. The next
     * not-to-be-removed segment after the active segment becomes the new
     * active segment. If there's none, then the next not-to-be-removed segment
     * before the active segment, becomes the new active segment.
     */
    removeSegments() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_remove_segments(this.ptr);
    }
    /**
     * Moves all the selected segments up, unless the first segment is
     * selected. The run's information is automatically adjusted properly. The
     * active segment stays the active segment.
     */
    moveSegmentsUp() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_move_segments_up(this.ptr);
    }
    /**
     * Moves all the selected segments down, unless the last segment is
     * selected. The run's information is automatically adjusted properly. The
     * active segment stays the active segment.
     */
    moveSegmentsDown() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_move_segments_down(this.ptr);
    }
    /**
     * Creates a native segment group from the currently selected contiguous
     * segment rows. Returns false if the selection is not contiguous or overlaps
     * an existing group.
     */
    createSegmentGroupFromSelection(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        const result = wasm.RunEditor_create_segment_group_from_selection(this.ptr, name_allocated.ptr) != 0;
        dealloc(name_allocated);
        return result;
    }
    /**
     * Selects every segment in the native segment group with the provided index
     * and unselects all other segments. Returns false if the group doesn't
     * exist.
     */
    selectSegmentGroup(groupIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_select_segment_group(this.ptr, groupIndex) != 0;
        return result;
    }
    /**
     * Toggles the native segment group with the provided index as part of the
     * current selection without clearing other selected rows. Returns false if
     * the group doesn't exist.
     */
    toggleSegmentGroupSelection(groupIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_toggle_segment_group_selection(this.ptr, groupIndex) != 0;
        return result;
    }
    /**
     * Extends the current selection through the entire native segment group with
     * the provided index. Returns false if the group doesn't exist.
     */
    selectSegmentGroupRange(groupIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_select_segment_group_range(this.ptr, groupIndex) != 0;
        return result;
    }
    /**
     * Removes the selected native segment groups, while keeping all segments.
     */
    removeSelectedSegmentGroups() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_remove_selected_segment_groups(this.ptr) != 0;
        return result;
    }
    /**
     * Renames the native segment group with the provided index.
     */
    renameSegmentGroup(groupIndex, name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        const result = wasm.RunEditor_rename_segment_group(this.ptr, groupIndex, name_allocated.ptr) != 0;
        dealloc(name_allocated);
        return result;
    }
    /**
     * Sets the icon of the native segment group with the provided index.
     */
    setSegmentGroupIcon(groupIndex, data, length) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_set_segment_group_icon(this.ptr, groupIndex, data, length) != 0;
        return result;
    }
    /**
     * Removes the explicit icon of the native segment group with the provided
     * index.
     */
    removeSegmentGroupIcon(groupIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_remove_segment_group_icon(this.ptr, groupIndex) != 0;
        return result;
    }
    /**
     * Sets the icon of the active segment.
     */
    activeSetIcon(data, length) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_active_set_icon(this.ptr, data, length);
    }
    /**
     * Removes the icon of the active segment.
     */
    activeRemoveIcon() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_active_remove_icon(this.ptr);
    }
    /**
     * Sets the name of the active segment.
     */
    activeSetName(name) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        wasm.RunEditor_active_set_name(this.ptr, name_allocated.ptr);
        dealloc(name_allocated);
    }
    /**
     * Parses a split time from a string and sets it for the active segment with
     * the chosen timing method.
     */
    activeParseAndSetSplitTime(time, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const time_allocated = allocString(time);
        const result = wasm.RunEditor_active_parse_and_set_split_time(this.ptr, time_allocated.ptr, lang) != 0;
        dealloc(time_allocated);
        return result;
    }
    /**
     * Parses a segment time from a string and sets it for the active segment with
     * the chosen timing method.
     */
    activeParseAndSetSegmentTime(time, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const time_allocated = allocString(time);
        const result = wasm.RunEditor_active_parse_and_set_segment_time(this.ptr, time_allocated.ptr, lang) != 0;
        dealloc(time_allocated);
        return result;
    }
    /**
     * Parses a best segment time from a string and sets it for the active segment
     * with the chosen timing method.
     */
    activeParseAndSetBestSegmentTime(time, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const time_allocated = allocString(time);
        const result = wasm.RunEditor_active_parse_and_set_best_segment_time(this.ptr, time_allocated.ptr, lang) != 0;
        dealloc(time_allocated);
        return result;
    }
    /**
     * Parses a comparison time for the provided comparison and sets it for the
     * active active segment with the chosen timing method.
     */
    activeParseAndSetComparisonTime(comparison, time, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const comparison_allocated = allocString(comparison);
        const time_allocated = allocString(time);
        const result = wasm.RunEditor_active_parse_and_set_comparison_time(this.ptr, comparison_allocated.ptr, time_allocated.ptr, lang) != 0;
        dealloc(comparison_allocated);
        dealloc(time_allocated);
        return result;
    }
    /**
     * Adds a new custom comparison. It can't be added if it starts with
     * `[Race]` or it already exists.
     */
    addComparison(comparison) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const comparison_allocated = allocString(comparison);
        const result = wasm.RunEditor_add_comparison(this.ptr, comparison_allocated.ptr) != 0;
        dealloc(comparison_allocated);
        return result;
    }
    /**
     * Imports the Personal Best from the provided run as a comparison. The
     * comparison can't be added if its name starts with `[Race]` or it already
     * exists.
     */
    importComparison(run, comparison) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (run.ptr == 0) {
            throw "run is disposed";
        }
        const comparison_allocated = allocString(comparison);
        const result = wasm.RunEditor_import_comparison(this.ptr, run.ptr, comparison_allocated.ptr) != 0;
        dealloc(comparison_allocated);
        return result;
    }
    /**
     * Removes the chosen custom comparison. You can't remove a Comparison
     * Generator's Comparison or the Personal Best.
     */
    removeComparison(comparison) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const comparison_allocated = allocString(comparison);
        wasm.RunEditor_remove_comparison(this.ptr, comparison_allocated.ptr);
        dealloc(comparison_allocated);
    }
    /**
     * Renames a comparison. The comparison can't be renamed if the new name of
     * the comparison starts with `[Race]` or it already exists.
     */
    renameComparison(oldName, newName) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const oldName_allocated = allocString(oldName);
        const newName_allocated = allocString(newName);
        const result = wasm.RunEditor_rename_comparison(this.ptr, oldName_allocated.ptr, newName_allocated.ptr) != 0;
        dealloc(oldName_allocated);
        dealloc(newName_allocated);
        return result;
    }
    /**
     * Reorders the custom comparisons by moving the comparison with the source
     * index specified to the destination index specified. Returns false if one
     * of the indices is invalid. The indices are based on the comparison names of
     * the Run Editor's state.
     */
    moveComparison(srcIndex, dstIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunEditor_move_comparison(this.ptr, srcIndex, dstIndex) != 0;
        return result;
    }
    /**
     * Parses a goal time and generates a custom goal comparison based on the
     * parsed value. The comparison's times are automatically balanced based on the
     * runner's history such that it roughly represents what split times for the
     * goal time would roughly look like. Since it is populated by the runner's
     * history, only goal times within the sum of the best segments and the sum of
     * the worst segments are supported. Everything else is automatically capped by
     * that range. The comparison is only populated for the selected timing method.
     * The other timing method's comparison times are not modified by this, so you
     * can call this again with the other timing method to generate the comparison
     * times for both timing methods.
     */
    parseAndGenerateGoalComparison(time, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const time_allocated = allocString(time);
        const result = wasm.RunEditor_parse_and_generate_goal_comparison(this.ptr, time_allocated.ptr, lang) != 0;
        dealloc(time_allocated);
        return result;
    }
    /**
     * Copies a comparison with the given name as a new custom comparison with the
     * new name provided. It can't be added if it starts with `[Race]` or it
     * already exists. The old comparison needs to exist.
     */
    copyComparison(oldName, newName) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const oldName_allocated = allocString(oldName);
        const newName_allocated = allocString(newName);
        const result = wasm.RunEditor_copy_comparison(this.ptr, oldName_allocated.ptr, newName_allocated.ptr) != 0;
        dealloc(oldName_allocated);
        dealloc(newName_allocated);
        return result;
    }
    /**
     * Clears out the Attempt History and the Segment Histories of all the
     * segments.
     */
    clearHistory() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_clear_history(this.ptr);
    }
    /**
     * Clears out the Attempt History, the Segment Histories, all the times,
     * sets the Attempt Count to 0 and clears the speedrun.com run id
     * association. All Custom Comparisons other than `Personal Best` are
     * deleted as well.
     */
    clearTimes() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.RunEditor_clear_times(this.ptr);
    }
    /**
     * Creates a Sum of Best Cleaner which allows you to interactively remove
     * potential issues in the segment history that lead to an inaccurate Sum
     * of Best. If you skip a split, whenever you will do the next split, the
     * combined segment time might be faster than the sum of the individual
     * best segments. The Sum of Best Cleaner will point out all of these and
     * allows you to delete them individually if any of them seem wrong.
     */
    cleanSumOfBest(lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SumOfBestCleaner(wasm.RunEditor_clean_sum_of_best(this.ptr, lang));
        return result;
    }
    setGameIconFromArray(data) {
        const slice = allocUint8Array(data);
        this.setGameIcon(slice.ptr, slice.len);
        dealloc(slice);
    }
    activeSetIconFromArray(data) {
        const slice = allocUint8Array(data);
        this.activeSetIcon(slice.ptr, slice.len);
        dealloc(slice);
    }
    setSegmentGroupIconFromArray(groupIndex, data) {
        const slice = allocUint8Array(data);
        const result = this.setSegmentGroupIcon(groupIndex, slice.ptr, slice.len);
        dealloc(slice);
        return result;
    }
}
/**
 * The Run Editor allows modifying Runs while ensuring that all the different
 * invariants of the Run objects are upheld no matter what kind of operations
 * are being applied to the Run. It provides the current state of the editor as
 * state objects that can be visualized by any kind of User Interface.
 */
export class RunEditor extends RunEditorRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Run Editor that modifies the Run provided. Creation of the Run
     * Editor fails when a Run with no segments is provided. If a Run object with
     * no segments is provided, the Run Editor creation fails and null is
     * returned.
     */
    static new(run) {
        if (run.ptr == 0) {
            throw "run is disposed";
        }
        const result = new RunEditor(wasm.RunEditor_new(run.ptr));
        run.ptr = 0;
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Closes the Run Editor and gives back access to the modified Run object. In
     * case you want to implement a Cancel Button, just dispose the Run object you
     * get here.
     */
    close() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Run(wasm.RunEditor_close(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export class RunMetadataRef {
    ptr;
    /**
     * Accesses the speedrun.com Run ID of the run. This Run ID specify which
     * Record on speedrun.com this run is associated with. This should be
     * changed once the Personal Best doesn't match up with that record
     * anymore. This may be empty if there's no association.
     */
    runId() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadata_run_id(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the name of the platform this game is run on. This may be empty
     * if it's not specified.
     */
    platformName() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadata_platform_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns true if this speedrun is done on an emulator. However false
     * may also indicate that this information is simply not known.
     */
    usesEmulator() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadata_uses_emulator(this.ptr) != 0;
        return result;
    }
    /**
     * Accesses the name of the region this game is from. This may be empty if
     * it's not specified.
     */
    regionName() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadata_region_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns an iterator iterating over all the speedrun.com variables and their
     * values that have been specified.
     */
    speedrunComVariables() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new RunMetadataSpeedrunComVariablesIter(wasm.RunMetadata_speedrun_com_variables(this.ptr));
        return result;
    }
    /**
     * Returns an iterator iterating over all the custom variables and their
     * values. This includes both temporary and permanent variables.
     */
    customVariables() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new RunMetadataCustomVariablesIter(wasm.RunMetadata_custom_variables(this.ptr));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export class RunMetadataRefMut extends RunMetadataRef {
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export class RunMetadata extends RunMetadataRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export class RunMetadataCustomVariableRef {
    ptr;
    /**
     * Accesses the name of this custom variable.
     */
    name() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadataCustomVariable_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the value of this custom variable.
     */
    value() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadataCustomVariable_value(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns true if the custom variable is permanent. Permanent variables get
     * stored in the splits file and are visible in the run editor. Temporary
     * variables are not.
     */
    isPermanent() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadataCustomVariable_is_permanent(this.ptr) != 0;
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export class RunMetadataCustomVariableRefMut extends RunMetadataCustomVariableRef {
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export class RunMetadataCustomVariable extends RunMetadataCustomVariableRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.RunMetadataCustomVariable_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * An iterator iterating over all the custom variables and their values
 * that have been specified.
 */
export class RunMetadataCustomVariablesIterRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * An iterator iterating over all the custom variables and their values
 * that have been specified.
 */
export class RunMetadataCustomVariablesIterRefMut extends RunMetadataCustomVariablesIterRef {
    /**
     * Accesses the next custom variable. Returns null if there are no more
     * variables.
     */
    next() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new RunMetadataCustomVariableRef(wasm.RunMetadataCustomVariablesIter_next(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
}
/**
 * An iterator iterating over all the custom variables and their values
 * that have been specified.
 */
export class RunMetadataCustomVariablesIter extends RunMetadataCustomVariablesIterRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.RunMetadataCustomVariablesIter_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A speedrun.com variable is an arbitrary key value pair storing additional
 * information about the category. An example of this may be whether Amiibos
 * are used in the category.
 */
export class RunMetadataSpeedrunComVariableRef {
    ptr;
    /**
     * Accesses the name of this speedrun.com variable.
     */
    name() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadataSpeedrunComVariable_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the value of this speedrun.com variable.
     */
    value() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.RunMetadataSpeedrunComVariable_value(this.ptr);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A speedrun.com variable is an arbitrary key value pair storing additional
 * information about the category. An example of this may be whether Amiibos
 * are used in the category.
 */
export class RunMetadataSpeedrunComVariableRefMut extends RunMetadataSpeedrunComVariableRef {
}
/**
 * A speedrun.com variable is an arbitrary key value pair storing additional
 * information about the category. An example of this may be whether Amiibos
 * are used in the category.
 */
export class RunMetadataSpeedrunComVariable extends RunMetadataSpeedrunComVariableRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.RunMetadataSpeedrunComVariable_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * An iterator iterating over all the speedrun.com variables and their values
 * that have been specified.
 */
export class RunMetadataSpeedrunComVariablesIterRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * An iterator iterating over all the speedrun.com variables and their values
 * that have been specified.
 */
export class RunMetadataSpeedrunComVariablesIterRefMut extends RunMetadataSpeedrunComVariablesIterRef {
    /**
     * Accesses the next speedrun.com variable. Returns null if there are no more
     * variables.
     */
    next() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new RunMetadataSpeedrunComVariableRef(wasm.RunMetadataSpeedrunComVariablesIter_next(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
}
/**
 * An iterator iterating over all the speedrun.com variables and their values
 * that have been specified.
 */
export class RunMetadataSpeedrunComVariablesIter extends RunMetadataSpeedrunComVariablesIterRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.RunMetadataSpeedrunComVariablesIter_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A Segment describes a point in a speedrun that is suitable for storing a
 * split time. This stores the name of that segment, an icon, the split times
 * of different comparisons, and a history of segment times.
 */
export class SegmentRef {
    ptr;
    /**
     * Accesses the name of the segment.
     */
    name() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Segment_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the segment icon's data. If there is no segment icon, this returns
     * an empty buffer.
     */
    iconPtr() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Segment_icon_ptr(this.ptr);
        return result;
    }
    /**
     * Accesses the amount of bytes the segment icon's data takes up.
     */
    iconLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Segment_icon_len(this.ptr);
        return result;
    }
    /**
     * Accesses the specified comparison's time. If there's none for this
     * comparison, an empty time is being returned (but not stored in the
     * segment).
     */
    comparison(comparison) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const comparison_allocated = allocString(comparison);
        const result = new TimeRef(wasm.Segment_comparison(this.ptr, comparison_allocated.ptr));
        dealloc(comparison_allocated);
        return result;
    }
    /**
     * Accesses the split time of the Personal Best for this segment. If it
     * doesn't exist, an empty time is returned.
     */
    personalBestSplitTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeRef(wasm.Segment_personal_best_split_time(this.ptr));
        return result;
    }
    /**
     * Accesses the Best Segment Time.
     */
    bestSegmentTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeRef(wasm.Segment_best_segment_time(this.ptr));
        return result;
    }
    /**
     * Accesses the Segment History of this segment.
     */
    segmentHistory() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SegmentHistoryRef(wasm.Segment_segment_history(this.ptr));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Segment describes a point in a speedrun that is suitable for storing a
 * split time. This stores the name of that segment, an icon, the split times
 * of different comparisons, and a history of segment times.
 */
export class SegmentRefMut extends SegmentRef {
}
/**
 * A Segment describes a point in a speedrun that is suitable for storing a
 * split time. This stores the name of that segment, an icon, the split times
 * of different comparisons, and a history of segment times.
 */
export class Segment extends SegmentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.Segment_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Segment with the name given.
     */
    static new(name) {
        const name_allocated = allocString(name);
        const result = new Segment(wasm.Segment_new(name_allocated.ptr));
        dealloc(name_allocated);
        return result;
    }
}
/**
 * A Segment Group describes a contiguous range of segments that forms a
 * one-level group.
 */
export class SegmentGroupRef {
    ptr;
    /**
     * Accesses the inclusive start index of the segment group.
     */
    start() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SegmentGroup_start(this.ptr);
        return result;
    }
    /**
     * Accesses the exclusive end index of the segment group.
     */
    end() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SegmentGroup_end(this.ptr);
        return result;
    }
    /**
     * Accesses the explicit name of the segment group. If the group uses the
     * final segment's name instead, an empty string is returned.
     */
    name() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SegmentGroup_name(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the explicit icon's data. If the group uses the final segment's
     * icon instead, an empty buffer is returned.
     */
    iconPtr() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SegmentGroup_icon_ptr(this.ptr);
        return result;
    }
    /**
     * Accesses the amount of bytes the explicit icon's data takes up.
     */
    iconLen() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SegmentGroup_icon_len(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Segment Group describes a contiguous range of segments that forms a
 * one-level group.
 */
export class SegmentGroupRefMut extends SegmentGroupRef {
}
/**
 * A Segment Group describes a contiguous range of segments that forms a
 * one-level group.
 */
export class SegmentGroup extends SegmentGroupRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * Stores the segment times achieved for a certain segment. Each segment is
 * tagged with an index. Only segment times with an index larger than 0 are
 * considered times actually achieved by the runner, while the others are
 * artifacts of route changes and similar algorithmic changes.
 */
export class SegmentHistoryRef {
    ptr;
    /**
     * Iterates over all the segment times and their indices.
     */
    iter() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SegmentHistoryIter(wasm.SegmentHistory_iter(this.ptr));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * Stores the segment times achieved for a certain segment. Each segment is
 * tagged with an index. Only segment times with an index larger than 0 are
 * considered times actually achieved by the runner, while the others are
 * artifacts of route changes and similar algorithmic changes.
 */
export class SegmentHistoryRefMut extends SegmentHistoryRef {
}
/**
 * Stores the segment times achieved for a certain segment. Each segment is
 * tagged with an index. Only segment times with an index larger than 0 are
 * considered times actually achieved by the runner, while the others are
 * artifacts of route changes and similar algorithmic changes.
 */
export class SegmentHistory extends SegmentHistoryRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * A segment time achieved for a segment. It is tagged with an index. Only
 * segment times with an index larger than 0 are considered times actually
 * achieved by the runner, while the others are artifacts of route changes and
 * similar algorithmic changes.
 */
export class SegmentHistoryElementRef {
    ptr;
    /**
     * Accesses the index of the segment history element.
     */
    index() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SegmentHistoryElement_index(this.ptr);
        return result;
    }
    /**
     * Accesses the segment time of the segment history element.
     */
    time() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeRef(wasm.SegmentHistoryElement_time(this.ptr));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A segment time achieved for a segment. It is tagged with an index. Only
 * segment times with an index larger than 0 are considered times actually
 * achieved by the runner, while the others are artifacts of route changes and
 * similar algorithmic changes.
 */
export class SegmentHistoryElementRefMut extends SegmentHistoryElementRef {
}
/**
 * A segment time achieved for a segment. It is tagged with an index. Only
 * segment times with an index larger than 0 are considered times actually
 * achieved by the runner, while the others are artifacts of route changes and
 * similar algorithmic changes.
 */
export class SegmentHistoryElement extends SegmentHistoryElementRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            this.ptr = 0;
        }
    }
}
/**
 * Iterates over all the segment times of a segment and their indices.
 */
export class SegmentHistoryIterRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * Iterates over all the segment times of a segment and their indices.
 */
export class SegmentHistoryIterRefMut extends SegmentHistoryIterRef {
    /**
     * Accesses the next Segment History element. Returns null if there are no
     * more elements.
     */
    next() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SegmentHistoryElementRef(wasm.SegmentHistoryIter_next(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
}
/**
 * Iterates over all the segment times of a segment and their indices.
 */
export class SegmentHistoryIter extends SegmentHistoryIterRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SegmentHistoryIter_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Segment Time Component is a component that shows the time for the current
 * segment in a comparison of your choosing. If no comparison is specified it
 * uses the timer's current comparison.
 */
export class SegmentTimeComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.SegmentTimeComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.SegmentTimeComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Segment Time Component is a component that shows the time for the current
 * segment in a comparison of your choosing. If no comparison is specified it
 * uses the timer's current comparison.
 */
export class SegmentTimeComponentRefMut extends SegmentTimeComponentRef {
}
/**
 * The Segment Time Component is a component that shows the time for the current
 * segment in a comparison of your choosing. If no comparison is specified it
 * uses the timer's current comparison.
 */
export class SegmentTimeComponent extends SegmentTimeComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SegmentTimeComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Segment Time Component.
     */
    static new() {
        const result = new SegmentTimeComponent(wasm.SegmentTimeComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.SegmentTimeComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Separator Component is a simple component that only serves to render
 * separators between components.
 */
export class SeparatorComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Separator Component is a simple component that only serves to render
 * separators between components.
 */
export class SeparatorComponentRefMut extends SeparatorComponentRef {
    /**
     * Calculates the component's state.
     */
    state() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new SeparatorComponentState(wasm.SeparatorComponent_state(this.ptr));
        return result;
    }
}
/**
 * The Separator Component is a simple component that only serves to render
 * separators between components.
 */
export class SeparatorComponent extends SeparatorComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SeparatorComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Separator Component.
     */
    static new() {
        const result = new SeparatorComponent(wasm.SeparatorComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.SeparatorComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class SeparatorComponentStateRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class SeparatorComponentStateRefMut extends SeparatorComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class SeparatorComponentState extends SeparatorComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SeparatorComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Splits Component is the main component for visualizing all the split
 * times. Each segment is shown in a tabular fashion showing the segment icon,
 * segment name, the delta compared to the chosen comparison, and the split
 * time. The list provides scrolling functionality, so not every segment needs
 * to be shown all the time.
 */
export class SplitsComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Splits Component is the main component for visualizing all the split
 * times. Each segment is shown in a tabular fashion showing the segment icon,
 * segment name, the delta compared to the chosen comparison, and the split
 * time. The list provides scrolling functionality, so not every segment needs
 * to be shown all the time.
 */
export class SplitsComponentRefMut extends SplitsComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(imageCache, timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = wasm.SplitsComponent_state_as_json(this.ptr, imageCache.ptr, timer.ptr, layoutSettings.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer and layout settings
     * provided.
     */
    state(imageCache, timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = new SplitsComponentState(wasm.SplitsComponent_state(this.ptr, imageCache.ptr, timer.ptr, layoutSettings.ptr, lang));
        return result;
    }
    /**
     * Scrolls up the window of the segments that are shown. Doesn't move the
     * scroll window if it reaches the top of the segments.
     */
    scrollUp() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.SplitsComponent_scroll_up(this.ptr);
    }
    /**
     * Scrolls down the window of the segments that are shown. Doesn't move the
     * scroll window if it reaches the bottom of the segments.
     */
    scrollDown() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.SplitsComponent_scroll_down(this.ptr);
    }
    /**
     * The amount of segments to show in the list at any given time. If this is
     * set to 0, all the segments are shown. If this is set to a number lower
     * than the total amount of segments, only a certain window of all the
     * segments is shown. This window can scroll up or down.
     */
    setVisualSplitCount(count) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.SplitsComponent_set_visual_split_count(this.ptr, count);
    }
    /**
     * If there's more segments than segments that are shown, the window
     * showing the segments automatically scrolls up and down when the current
     * segment changes. This count determines the minimum number of future
     * segments to be shown in this scrolling window when it automatically
     * scrolls.
     */
    setSplitPreviewCount(count) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.SplitsComponent_set_split_preview_count(this.ptr, count);
    }
    /**
     * If not every segment is shown in the scrolling window of segments, then
     * this determines whether the final segment is always to be shown, as it
     * contains valuable information about the total duration of the chosen
     * comparison, which is often the runner's Personal Best.
     */
    setAlwaysShowLastSplit(alwaysShowLastSplit) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.SplitsComponent_set_always_show_last_split(this.ptr, alwaysShowLastSplit ? 1 : 0);
    }
    /**
     * Whether to show a pronounced separator before a row when one or more rows
     * immediately before it are omitted from the scrolling window.
     */
    setShowGapSeparators(showGapSeparators) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.SplitsComponent_set_show_gap_separators(this.ptr, showGapSeparators ? 1 : 0);
    }
}
/**
 * The Splits Component is the main component for visualizing all the split
 * times. Each segment is shown in a tabular fashion showing the segment icon,
 * segment name, the delta compared to the chosen comparison, and the split
 * time. The list provides scrolling functionality, so not every segment needs
 * to be shown all the time.
 */
export class SplitsComponent extends SplitsComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SplitsComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Splits Component.
     */
    static new(lang) {
        const result = new SplitsComponent(wasm.SplitsComponent_new(lang));
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.SplitsComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object that describes a single segment's information to visualize.
 */
export class SplitsComponentStateRef {
    ptr;
    /**
     * Returns the amount of segments to visualize.
     */
    len() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_len(this.ptr);
        return result;
    }
    /**
     * The icon of the segment. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_icon(this.ptr, index);
        return decodeString(result);
    }
    /**
     * The name of the segment with the specified index. You may not provide an out
     * of bounds index.
     */
    name(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_name(this.ptr, index);
        return decodeString(result);
    }
    /**
     * The amount of columns to visualize for the segment with the specified index.
     * The columns are specified from right to left. You may not provide an out of
     * bounds index. The amount of columns to visualize may differ from segment to
     * segment.
     */
    columnsLen(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_columns_len(this.ptr, index);
        return result;
    }
    /**
     * The column's value to show for the split and column with the specified
     * index. The columns are specified from right to left. You may not provide an
     * out of bounds index.
     */
    columnValue(index, columnIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_column_value(this.ptr, index, columnIndex);
        return decodeString(result);
    }
    /**
     * The semantic coloring information the column's value carries of the segment
     * and column with the specified index. The columns are specified from right to
     * left. You may not provide an out of bounds index.
     */
    columnSemanticColor(index, columnIndex) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_column_semantic_color(this.ptr, index, columnIndex);
        return decodeString(result);
    }
    /**
     * Describes if the segment with the specified index is the segment the active
     * attempt is currently on.
     */
    isCurrentSplit(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_is_current_split(this.ptr, index) != 0;
        return result;
    }
    /**
     * Describes if the segment with the specified index is the segment selected
     * by manually scrolling through subsplit groups.
     */
    isScrolledToSplit(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_is_scrolled_to_split(this.ptr, index) != 0;
        return result;
    }
    /**
     * Specifies whether the row with the specified index should be indented. You
     * may not provide an out of bounds index.
     */
    isIndented(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_is_indented(this.ptr, index) != 0;
        return result;
    }
    /**
     * Specifies whether a more pronounced separator should be shown before the
     * row with the specified index because one or more logical rows preceding it
     * are not visible. You may not provide an out of bounds index.
     */
    separatorBefore(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_separator_before(this.ptr, index) != 0;
        return result;
    }
    /**
     * Returns the visual section that the row with the specified index belongs
     * to. Renderers can use this to alternate backgrounds when multiple flat
     * segments collapse into a single section. You may not provide an out of
     * bounds index.
     */
    sectionIndex(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_section_index(this.ptr, index);
        return result;
    }
    /**
     * Describes if the columns have labels that are meant to be shown. If this is
     * `false`, no labels are supposed to be visualized.
     */
    hasColumnLabels() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_has_column_labels(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the label of the column specified. The list is specified from right
     * to left. You may not provide an out of bounds index.
     */
    columnLabel(index) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.SplitsComponentState_column_label(this.ptr, index);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object that describes a single segment's information to visualize.
 */
export class SplitsComponentStateRefMut extends SplitsComponentStateRef {
}
/**
 * The state object that describes a single segment's information to visualize.
 */
export class SplitsComponentState extends SplitsComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SplitsComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A Sum of Best Cleaner allows you to interactively remove potential issues in
 * the Segment History that lead to an inaccurate Sum of Best. If you skip a
 * split, whenever you get to the next split, the combined segment time might
 * be faster than the sum of the individual best segments. The Sum of Best
 * Cleaner will point out all of occurrences of this and allows you to delete
 * them individually if any of them seem wrong.
 */
export class SumOfBestCleanerRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Sum of Best Cleaner allows you to interactively remove potential issues in
 * the Segment History that lead to an inaccurate Sum of Best. If you skip a
 * split, whenever you get to the next split, the combined segment time might
 * be faster than the sum of the individual best segments. The Sum of Best
 * Cleaner will point out all of occurrences of this and allows you to delete
 * them individually if any of them seem wrong.
 */
export class SumOfBestCleanerRefMut extends SumOfBestCleanerRef {
    /**
     * Returns the next potential clean up. If there are no more potential
     * clean ups, null is returned.
     */
    nextPotentialCleanUp() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new PotentialCleanUp(wasm.SumOfBestCleaner_next_potential_clean_up(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Applies a clean up to the Run.
     */
    apply(cleanUp) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (cleanUp.ptr == 0) {
            throw "cleanUp is disposed";
        }
        wasm.SumOfBestCleaner_apply(this.ptr, cleanUp.ptr);
        cleanUp.ptr = 0;
    }
}
/**
 * A Sum of Best Cleaner allows you to interactively remove potential issues in
 * the Segment History that lead to an inaccurate Sum of Best. If you skip a
 * split, whenever you get to the next split, the combined segment time might
 * be faster than the sum of the individual best segments. The Sum of Best
 * Cleaner will point out all of occurrences of this and allows you to delete
 * them individually if any of them seem wrong.
 */
export class SumOfBestCleaner extends SumOfBestCleanerRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SumOfBestCleaner_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Sum of Best Segments Component shows the fastest possible time to
 * complete a run of this category, based on information collected from all the
 * previous attempts. This often matches up with the sum of the best segment
 * times of all the segments, but that may not always be the case, as skipped
 * segments may introduce combined segments that may be faster than the actual
 * sum of their best segment times. The name is therefore a bit misleading, but
 * sticks around for historical reasons.
 */
export class SumOfBestComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.SumOfBestComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.SumOfBestComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Sum of Best Segments Component shows the fastest possible time to
 * complete a run of this category, based on information collected from all the
 * previous attempts. This often matches up with the sum of the best segment
 * times of all the segments, but that may not always be the case, as skipped
 * segments may introduce combined segments that may be faster than the actual
 * sum of their best segment times. The name is therefore a bit misleading, but
 * sticks around for historical reasons.
 */
export class SumOfBestComponentRefMut extends SumOfBestComponentRef {
}
/**
 * The Sum of Best Segments Component shows the fastest possible time to
 * complete a run of this category, based on information collected from all the
 * previous attempts. This often matches up with the sum of the best segment
 * times of all the segments, but that may not always be the case, as skipped
 * segments may introduce combined segments that may be faster than the actual
 * sum of their best segment times. The name is therefore a bit misleading, but
 * sticks around for historical reasons.
 */
export class SumOfBestComponent extends SumOfBestComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.SumOfBestComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Sum of Best Segments Component.
     */
    static new() {
        const result = new SumOfBestComponent(wasm.SumOfBestComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.SumOfBestComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Text Component simply visualizes any given text. This can either be a
 * single centered text, or split up into a left and right text, which is
 * suitable for a situation where you have a label and a value.
 */
export class TextComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.TextComponent_state_as_json(this.ptr, timer.ptr);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state.
     */
    state(timer) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new TextComponentState(wasm.TextComponent_state(this.ptr, timer.ptr));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Text Component simply visualizes any given text. This can either be a
 * single centered text, or split up into a left and right text, which is
 * suitable for a situation where you have a label and a value.
 */
export class TextComponentRefMut extends TextComponentRef {
    /**
     * Switches the component to display the specified custom variable instead of a
     * fixed text. The boolean indicates whether the name should also be shown as a
     * key value pair.
     */
    useVariable(variable, split) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const variable_allocated = allocString(variable);
        wasm.TextComponent_use_variable(this.ptr, variable_allocated.ptr, split ? 1 : 0);
        dealloc(variable_allocated);
    }
    /**
     * Sets the centered text. If the current mode is split, it is switched to
     * centered mode.
     */
    setCenter(text) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const text_allocated = allocString(text);
        wasm.TextComponent_set_center(this.ptr, text_allocated.ptr);
        dealloc(text_allocated);
    }
    /**
     * Sets the left text. If the current mode is centered, it is switched to
     * split mode, with the right text being empty.
     */
    setLeft(text) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const text_allocated = allocString(text);
        wasm.TextComponent_set_left(this.ptr, text_allocated.ptr);
        dealloc(text_allocated);
    }
    /**
     * Sets the right text. If the current mode is centered, it is switched to
     * split mode, with the left text being empty.
     */
    setRight(text) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const text_allocated = allocString(text);
        wasm.TextComponent_set_right(this.ptr, text_allocated.ptr);
        dealloc(text_allocated);
    }
}
/**
 * The Text Component simply visualizes any given text. This can either be a
 * single centered text, or split up into a left and right text, which is
 * suitable for a situation where you have a label and a value.
 */
export class TextComponent extends TextComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TextComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Text Component.
     */
    static new() {
        const result = new TextComponent(wasm.TextComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.TextComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TextComponentStateRef {
    ptr;
    /**
     * Accesses the left part of the text. If the text isn't split up, an empty
     * string is returned instead.
     */
    left() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TextComponentState_left(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the right part of the text. If the text isn't split up, an empty
     * string is returned instead.
     */
    right() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TextComponentState_right(this.ptr);
        return decodeString(result);
    }
    /**
     * Accesses the centered text. If the text isn't centered, an empty string is
     * returned instead.
     */
    center() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TextComponentState_center(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns whether the text is split up into a left and right part.
     */
    isSplit() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TextComponentState_is_split(this.ptr) != 0;
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TextComponentStateRefMut extends TextComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TextComponentState extends TextComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TextComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A time that can store a Real Time and a Game Time. Both of them are
 * optional.
 */
export class TimeRef {
    ptr;
    /**
     * Clones the time.
     */
    clone() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Time(wasm.Time_clone(this.ptr));
        return result;
    }
    /**
     * The Real Time value. This may be null if this time has no Real Time value.
     */
    realTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpanRef(wasm.Time_real_time(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * The Game Time value. This may be null if this time has no Game Time value.
     */
    gameTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpanRef(wasm.Time_game_time(this.ptr));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Access the time's value for the timing method specified.
     */
    index(timingMethod) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpanRef(wasm.Time_index(this.ptr, timingMethod));
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A time that can store a Real Time and a Game Time. Both of them are
 * optional.
 */
export class TimeRefMut extends TimeRef {
}
/**
 * A time that can store a Real Time and a Game Time. Both of them are
 * optional.
 */
export class Time extends TimeRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.Time_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * A Time Span represents a certain span of time.
 */
export class TimeSpanRef {
    ptr;
    /**
     * Clones the Time Span.
     */
    clone() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpan(wasm.TimeSpan_clone(this.ptr));
        return result;
    }
    /**
     * Returns the total amount of seconds (including decimals) this Time Span
     * represents.
     */
    totalSeconds() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimeSpan_total_seconds(this.ptr);
        return result;
    }
    /**
     * Returns the total amount of whole seconds (excluding decimals) this Time
     * Span represents.
     */
    wholeSeconds() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimeSpan_whole_seconds(this.ptr);
        return result;
    }
    /**
     * Returns the number of nanoseconds past the last full second that makes up
     * the Time Span.
     */
    subsecNanoseconds() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimeSpan_subsec_nanoseconds(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Time Span represents a certain span of time.
 */
export class TimeSpanRefMut extends TimeSpanRef {
    /**
     * Changes a Time Span by adding a Time Span onto it.
     */
    addAssign(other) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (other.ptr == 0) {
            throw "other is disposed";
        }
        wasm.TimeSpan_add_assign(this.ptr, other.ptr);
    }
}
/**
 * A Time Span represents a certain span of time.
 */
export class TimeSpan extends TimeSpanRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TimeSpan_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Time Span from a given amount of seconds.
     */
    static fromSeconds(seconds) {
        const result = new TimeSpan(wasm.TimeSpan_from_seconds(seconds));
        return result;
    }
    /**
     * Parses a Time Span from a string. Returns null if the time can't be
     * parsed.
     */
    static parse(text, lang) {
        const text_allocated = allocString(text);
        const result = new TimeSpan(wasm.TimeSpan_parse(text_allocated.ptr, lang));
        dealloc(text_allocated);
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
}
/**
 * A Timer provides all the capabilities necessary for doing speedrun attempts.
 */
export class TimerRef {
    ptr;
    /**
     * Accesses the index of the split the attempt is currently on. If there's
     * no attempt in progress, `-1` is returned instead. This returns an
     * index that is equal to the amount of segments when the attempt is
     * finished, but has not been reset. So you need to be careful when using
     * this value for indexing.
     */
    currentSplitIndex() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_current_split_index(this.ptr);
        return result;
    }
    /**
     * Checks whether the current attempt has new best segment times in any of the
     * segments (for both TimingMethods) or a new Personal Best (for the current
     * TimingMethod). This can be used to ask the user whether to update the splits
     * when resetting.
     */
    currentAttemptHasNewBestTimes() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_current_attempt_has_new_best_times(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the currently selected Timing Method.
     */
    currentTimingMethod() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_current_timing_method(this.ptr);
        return result;
    }
    /**
     * Returns the current comparison that is being compared against. This may
     * be a custom comparison or one of the Comparison Generators.
     */
    currentComparison() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_current_comparison(this.ptr);
        return decodeString(result);
    }
    /**
     * Returns whether Game Time is currently initialized. Game Time
     * automatically gets uninitialized for each new attempt.
     */
    isGameTimeInitialized() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_is_game_time_initialized(this.ptr) != 0;
        return result;
    }
    /**
     * Returns whether the Game Timer is currently paused. If the Game Timer is
     * not paused, it automatically increments similar to Real Time.
     */
    isGameTimePaused() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_is_game_time_paused(this.ptr) != 0;
        return result;
    }
    /**
     * Accesses the loading times. Loading times are defined as Game Time - Real Time.
     */
    loadingTimes() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeSpanRef(wasm.Timer_loading_times(this.ptr));
        return result;
    }
    /**
     * Returns the current Timer Phase.
     */
    currentPhase() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_current_phase(this.ptr);
        return result;
    }
    /**
     * Accesses the Run in use by the Timer.
     */
    getRun() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new RunRef(wasm.Timer_get_run(this.ptr));
        return result;
    }
    /**
     * Saves the Run in use by the Timer as a LiveSplit splits file (*.lss).
     */
    saveAsLss() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_save_as_lss(this.ptr);
        return decodeString(result);
    }
    /**
     * Prints out debug information representing the whole state of the Timer. This
     * is being written to stdout.
     */
    printDebug() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_print_debug(this.ptr);
    }
    /**
     * Returns the current time of the Timer. The Game Time is null if the Game
     * Time has not been initialized.
     */
    currentTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new TimeRef(wasm.Timer_current_time(this.ptr));
        return result;
    }
    saveAsLssBytes() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_save_as_lss(this.ptr);
        return decodeSlice(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * A Timer provides all the capabilities necessary for doing speedrun attempts.
 */
export class TimerRefMut extends TimerRef {
    /**
     * Replaces the Run object used by the Timer with the Run object provided. If
     * the Run provided contains no segments, it can't be used for timing and is
     * not being modified. Otherwise the Run that was in use by the Timer gets
     * stored in the Run object provided. Before the Run is returned, the current
     * attempt is reset and the splits are being updated depending on the
     * `update_splits` parameter. The return value indicates whether the Run got
     * replaced successfully.
     */
    replaceRun(run, updateSplits) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (run.ptr == 0) {
            throw "run is disposed";
        }
        const result = wasm.Timer_replace_run(this.ptr, run.ptr, updateSplits ? 1 : 0) != 0;
        return result;
    }
    /**
     * Sets the Run object used by the Timer with the Run object provided. If the
     * Run provided contains no segments, it can't be used for timing and gets
     * returned again. If the Run object can be set, the original Run object in use
     * by the Timer is disposed by this method and null is returned.
     */
    setRun(run) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (run.ptr == 0) {
            throw "run is disposed";
        }
        const result = new Run(wasm.Timer_set_run(this.ptr, run.ptr));
        run.ptr = 0;
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Starts the Timer if there is no attempt in progress. If that's not the
     * case, nothing happens.
     */
    start() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_start(this.ptr);
        return result;
    }
    /**
     * If an attempt is in progress, stores the current time as the time of the
     * current split. The attempt ends if the last split time is stored.
     */
    split() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_split(this.ptr);
        return result;
    }
    /**
     * Starts a new attempt or stores the current time as the time of the
     * current split. The attempt ends if the last split time is stored.
     */
    splitOrStart() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_split_or_start(this.ptr);
        return result;
    }
    /**
     * Skips the current split if an attempt is in progress and the
     * current split is not the last split.
     */
    skipSplit() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_skip_split(this.ptr);
        return result;
    }
    /**
     * Removes the split time from the last split if an attempt is in progress
     * and there is a previous split. The Timer Phase also switches to
     * `Running` if it previously was `Ended`.
     */
    undoSplit() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_undo_split(this.ptr);
        return result;
    }
    /**
     * Resets the current attempt if there is one in progress. If the splits
     * are to be updated, all the information of the current attempt is stored
     * in the Run's history. Otherwise the current attempt's information is
     * discarded.
     */
    reset(updateSplits) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_reset(this.ptr, updateSplits ? 1 : 0);
        return result;
    }
    /**
     * Resets the current attempt if there is one in progress. The splits are
     * updated such that the current attempt's split times are being stored as
     * the new Personal Best.
     */
    resetAndSetAttemptAsPb() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_reset_and_set_attempt_as_pb(this.ptr);
        return result;
    }
    /**
     * Pauses an active attempt that is not paused.
     */
    pause() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_pause(this.ptr);
        return result;
    }
    /**
     * Resumes an attempt that is paused.
     */
    resume() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_resume(this.ptr);
        return result;
    }
    /**
     * Toggles an active attempt between `Paused` and `Running`.
     */
    togglePause() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_toggle_pause(this.ptr);
        return result;
    }
    /**
     * Toggles an active attempt between `Paused` and `Running` or starts an
     * attempt if there's none in progress.
     */
    togglePauseOrStart() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_toggle_pause_or_start(this.ptr);
        return result;
    }
    /**
     * Removes all the pause times from the current time. If the current
     * attempt is paused, it also resumes that attempt. Additionally, if the
     * attempt is finished, the final split time is adjusted to not include the
     * pause times as well.
     *
     * # Warning
     *
     * This behavior is not entirely optimal, as generally only the final split
     * time is modified, while all other split times are left unmodified, which
     * may not be what actually happened during the run.
     */
    undoAllPauses() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_undo_all_pauses(this.ptr);
        return result;
    }
    /**
     * Sets the current Timing Method to the Timing Method provided.
     */
    setCurrentTimingMethod(method) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_set_current_timing_method(this.ptr, method);
    }
    /**
     * Toggles between the Real Time and Game Time timing methods.
     */
    toggleTimingMethod() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_toggle_timing_method(this.ptr);
    }
    /**
     * Tries to set the current comparison to the comparison specified. If the
     * comparison doesn't exist false is returned.
     */
    setCurrentComparison(comparison) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const comparison_allocated = allocString(comparison);
        const result = wasm.Timer_set_current_comparison(this.ptr, comparison_allocated.ptr);
        dealloc(comparison_allocated);
        return result;
    }
    /**
     * Switches the current comparison to the next comparison in the list.
     */
    switchToNextComparison() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_switch_to_next_comparison(this.ptr);
    }
    /**
     * Switches the current comparison to the previous comparison in the list.
     */
    switchToPreviousComparison() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_switch_to_previous_comparison(this.ptr);
    }
    /**
     * Initializes Game Time for the current attempt. Game Time automatically
     * gets uninitialized for each new attempt.
     */
    initializeGameTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_initialize_game_time(this.ptr);
        return result;
    }
    /**
     * Deinitializes Game Time for the current attempt.
     */
    deinitializeGameTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_deinitialize_game_time(this.ptr);
    }
    /**
     * Pauses the Game Timer such that it doesn't automatically increment
     * similar to Real Time.
     */
    pauseGameTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_pause_game_time(this.ptr);
        return result;
    }
    /**
     * Resumes the Game Timer such that it automatically increments similar to
     * Real Time, starting from the Game Time it was paused at.
     */
    resumeGameTime() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.Timer_resume_game_time(this.ptr);
        return result;
    }
    /**
     * Sets the Game Time to the time specified. This also works if the Game
     * Time is paused, which can be used as a way of updating the Game Timer
     * periodically without it automatically moving forward. This ensures that
     * the Game Timer never shows any time that is not coming from the game.
     */
    setGameTime(time) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (time.ptr == 0) {
            throw "time is disposed";
        }
        const result = wasm.Timer_set_game_time(this.ptr, time.ptr);
        return result;
    }
    /**
     * Instead of setting the Game Time directly, this method can be used to
     * just specify the amount of time the game has been loading. The Game Time
     * is then automatically determined by Real Time - Loading Times.
     */
    setLoadingTimes(time) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (time.ptr == 0) {
            throw "time is disposed";
        }
        const result = wasm.Timer_set_loading_times(this.ptr, time.ptr);
        return result;
    }
    /**
     * Sets the value of a custom variable with the name specified. If the variable
     * does not exist, a temporary variable gets created that will not be stored in
     * the splits file.
     */
    setCustomVariable(name, value) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const name_allocated = allocString(name);
        const value_allocated = allocString(value);
        wasm.Timer_set_custom_variable(this.ptr, name_allocated.ptr, value_allocated.ptr);
        dealloc(name_allocated);
        dealloc(value_allocated);
    }
    /**
     * Marks the Run as unmodified, so that it is known that all the changes
     * have been saved.
     */
    markAsUnmodified() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        wasm.Timer_mark_as_unmodified(this.ptr);
    }
}
/**
 * A Timer provides all the capabilities necessary for doing speedrun attempts.
 */
export class Timer extends TimerRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.Timer_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Timer based on a Run object storing all the information
     * about the splits. The Run object needs to have at least one segment, so
     * that the Timer can store the final time. If a Run object with no
     * segments is provided, the Timer creation fails and null is returned.
     */
    static new(run) {
        if (run.ptr == 0) {
            throw "run is disposed";
        }
        const result = new Timer(wasm.Timer_new(run.ptr));
        run.ptr = 0;
        if (result.ptr == 0) {
            return null;
        }
        return result;
    }
    /**
     * Takes out the Run from the Timer and resets the current attempt if there
     * is one in progress. If the splits are to be updated, all the information
     * of the current attempt is stored in the Run's history. Otherwise the
     * current attempt's information is discarded.
     */
    intoRun(updateSplits) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Run(wasm.Timer_into_run(this.ptr, updateSplits ? 1 : 0));
        this.ptr = 0;
        return result;
    }
}
/**
 * The Timer Component is a component that shows the total time of the current
 * attempt as a digital clock. The color of the time shown is based on a how
 * well the current attempt is doing compared to the chosen comparison.
 */
export class TimerComponentRef {
    ptr;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = wasm.TimerComponent_state_as_json(this.ptr, timer.ptr, layoutSettings.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer and the layout
     * settings provided.
     */
    state(timer, layoutSettings, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        if (layoutSettings.ptr == 0) {
            throw "layoutSettings is disposed";
        }
        const result = new TimerComponentState(wasm.TimerComponent_state(this.ptr, timer.ptr, layoutSettings.ptr, lang));
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Timer Component is a component that shows the total time of the current
 * attempt as a digital clock. The color of the time shown is based on a how
 * well the current attempt is doing compared to the chosen comparison.
 */
export class TimerComponentRefMut extends TimerComponentRef {
}
/**
 * The Timer Component is a component that shows the total time of the current
 * attempt as a digital clock. The color of the time shown is based on a how
 * well the current attempt is doing compared to the chosen comparison.
 */
export class TimerComponent extends TimerComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TimerComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Timer Component.
     */
    static new() {
        const result = new TimerComponent(wasm.TimerComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.TimerComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TimerComponentStateRef {
    ptr;
    /**
     * The time shown by the component without the fractional part.
     */
    time() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimerComponentState_time(this.ptr);
        return decodeString(result);
    }
    /**
     * The fractional part of the time shown (including the dot).
     */
    fraction() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimerComponentState_fraction(this.ptr);
        return decodeString(result);
    }
    /**
     * The text to measure when sizing the time without its fractional part. Covers
     * both the expected maximum and the currently displayed time, with all digits
     * normalized to `8`.
     */
    timeSizeHint() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimerComponentState_time_size_hint(this.ptr);
        return decodeString(result);
    }
    /**
     * The fractional part (including the decimal separator) to reserve when
     * sizing the timer, with digits normalized to `8`. Measure it at the fraction's
     * scale.
     */
    fractionSizeHint() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimerComponentState_fraction_size_hint(this.ptr);
        return decodeString(result);
    }
    /**
     * The semantic coloring information the time carries.
     */
    semanticColor() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TimerComponentState_semantic_color(this.ptr);
        return decodeString(result);
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TimerComponentStateRefMut extends TimerComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TimerComponentState extends TimerComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TimerComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Title Component is a component that shows the name of the game and the
 * category that is being run. Additionally, the game icon, the attempt count,
 * and the total number of successfully finished runs can be shown.
 */
export class TitleComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Title Component is a component that shows the name of the game and the
 * category that is being run. Additionally, the game icon, the attempt count,
 * and the total number of successfully finished runs can be shown.
 */
export class TitleComponentRefMut extends TitleComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(imageCache, timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.TitleComponent_state_as_json(this.ptr, imageCache.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(imageCache, timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (imageCache.ptr == 0) {
            throw "imageCache is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new TitleComponentState(wasm.TitleComponent_state(this.ptr, imageCache.ptr, timer.ptr, lang));
        return result;
    }
}
/**
 * The Title Component is a component that shows the name of the game and the
 * category that is being run. Additionally, the game icon, the attempt count,
 * and the total number of successfully finished runs can be shown.
 */
export class TitleComponent extends TitleComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TitleComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Title Component.
     */
    static new() {
        const result = new TitleComponent(wasm.TitleComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.TitleComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TitleComponentStateRef {
    ptr;
    /**
     * The game icon to show. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_icon(this.ptr);
        return decodeString(result);
    }
    /**
     * The first title line to show. This is either the game's name, or a
     * combination of the game's name and the category.
     */
    line1() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_line1(this.ptr);
        return decodeString(result);
    }
    /**
     * By default the category name is shown on the second line. Based on the
     * settings, it can however instead be shown in a single line together with
     * the game name. In that case null is returned instead.
     */
    line2() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_line2(this.ptr);
        if (result == 0) {
            return null;
        }
        return decodeString(result);
    }
    /**
     * Specifies whether the title should centered or aligned to the left
     * instead.
     */
    isCentered() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_is_centered(this.ptr) != 0;
        return result;
    }
    /**
     * Returns whether the amount of successfully finished attempts is supposed to
     * be shown.
     */
    showsFinishedRuns() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_shows_finished_runs(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the amount of successfully finished attempts.
     */
    finishedRuns() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_finished_runs(this.ptr);
        return result;
    }
    /**
     * Returns whether the amount of total attempts is supposed to be shown.
     */
    showsAttempts() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_shows_attempts(this.ptr) != 0;
        return result;
    }
    /**
     * Returns the amount of total attempts.
     */
    attempts() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = wasm.TitleComponentState_attempts(this.ptr);
        return result;
    }
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TitleComponentStateRefMut extends TitleComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export class TitleComponentState extends TitleComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TitleComponentState_drop(this.ptr);
            this.ptr = 0;
        }
    }
}
/**
 * The Total Playtime Component is a component that shows the total amount of
 * time that the current category has been played for.
 */
export class TotalPlaytimeComponentRef {
    ptr;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr) {
        this.ptr = ptr;
    }
}
/**
 * The Total Playtime Component is a component that shows the total amount of
 * time that the current category has been played for.
 */
export class TotalPlaytimeComponentRefMut extends TotalPlaytimeComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = wasm.TotalPlaytimeComponent_state_as_json(this.ptr, timer.ptr, lang);
        return JSON.parse(decodeString(result));
    }
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer, lang) {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        if (timer.ptr == 0) {
            throw "timer is disposed";
        }
        const result = new KeyValueComponentState(wasm.TotalPlaytimeComponent_state(this.ptr, timer.ptr, lang));
        return result;
    }
}
/**
 * The Total Playtime Component is a component that shows the total amount of
 * time that the current category has been played for.
 */
export class TotalPlaytimeComponent extends TotalPlaytimeComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose]() {
        if (this.ptr != 0) {
            wasm.TotalPlaytimeComponent_drop(this.ptr);
            this.ptr = 0;
        }
    }
    /**
     * Creates a new Total Playtime Component.
     */
    static new() {
        const result = new TotalPlaytimeComponent(wasm.TotalPlaytimeComponent_new());
        return result;
    }
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric() {
        if (this.ptr == 0) {
            throw "this is disposed";
        }
        const result = new Component(wasm.TotalPlaytimeComponent_into_generic(this.ptr));
        this.ptr = 0;
        return result;
    }
}
