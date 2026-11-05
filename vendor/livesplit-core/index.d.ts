/** The state object for one of the components available. */
export type ComponentStateJson = {
    BlankSpace: BlankSpaceComponentStateJson;
} | {
    DetailedTimer: DetailedTimerComponentStateJson;
} | {
    Graph: GraphComponentStateJson;
} | {
    KeyValue: KeyValueComponentStateJson;
} | {
    Separator: null;
} | {
    Splits: SplitsComponentStateJson;
} | {
    Text: TextComponentStateJson;
} | {
    Timer: TimerComponentStateJson;
} | {
    Title: TitleComponentStateJson;
};
/**
 * Colors can be used to describe what color to use for visualizing backgrounds,
 * texts, lines and various other elements that are being shown. They are stored
 * as RGBA colors with floating point numbers ranging from 0.0 to 1.0 per channel.
 */
export type Color = [red: number, green: number, blue: number, alpha: number];
/**
 * Describes a Gradient for coloring a region with more than just a single
 * color.
 */
export type Gradient = "Transparent" | {
    Plain: Color;
} | {
    Vertical: [top: Color, bottom: Color];
} | {
    Horizontal: [left: Color, right: Color];
};
/**
 * Describes an extended form of a gradient, specifically made for use with
 * lists. It allows specifying different coloration for the rows in a list.
 */
export type ListGradient = {
    Same: Gradient;
} | {
    Alternating: [even: Color, odd: Color];
};
/**
 * The ID of an image that can be used for looking up an image in an image
 * cache.
 */
export type ImageId = string;
/**
 * A constant that is part of the formula to calculate the sigma of a gaussian
 * blur for a background image. Check its documentation for a deeper
 * explanation.
 */
export declare const BLUR_FACTOR = 0.05;
export interface BackgroundImage {
    /** The image ID to look up the actual image in an image cache. */
    image: ImageId;
    /**
     * The brightness of the image in the range from `0` to `1`. This is for
     * darkening the image if it's too bright.
     */
    brightness: number;
    /**
     * The opacity of the image in the range from `0` to `1`. This is for making
     * the image more transparent.
     */
    opacity: number;
    /**
     * An additional gaussian blur that is applied to the image. It is in the
     * range from `0` to `1` and is meant to be multiplied with the larger of
     * the two dimensions of the image to ensure that the blur is independent of
     * the resolution of the image and then multiplied by `BLUR_FACTOR` to scale
     * it to a reasonable value. The resulting value is the sigma (standard
     * deviation) of the gaussian blur.
     *
     * sigma = BLUR_FACTOR * blur * max(width, height)
     */
    blur: number;
}
/** The background of a layout. */
export type LayoutBackground = Gradient | BackgroundImage;
/** Describes the Alignment of the Title in the Title Component. */
export type Alignment = "Auto" | "Left" | "Center";
/** The state object describes the information to visualize for the layout. */
export interface LayoutStateJson {
    /** The state objects for all of the components in the layout. */
    components: ComponentStateJson[];
    /** The direction which the components are laid out in. */
    direction: LayoutDirection;
    /**
     * The font to use for the timer text. `null` means a default font should be
     * used.
     */
    timer_font: Font | null;
    /**
     * The font to use for the times and other values. `null` means a default
     * font should be used.
     */
    times_font: Font | null;
    /**
     * The font to use for regular text. `null` means a default font should be
     * used.
     */
    text_font: Font | null;
    /** The background to show behind the layout. */
    background: Gradient;
    /** The color of thin separators. */
    thin_separators_color: Color;
    /** The color of normal separators. */
    separators_color: Color;
    /** The text color to use for text that doesn't specify its own color. */
    text_color: Color;
}
/**
 * Describes a Font to visualize text with. Depending on the platform a font
 * that matches the settings most closely is chosen. The settings may be ignored
 * entirely if the platform can't support different fonts such as in a terminal
 * for example.
 */
export interface Font {
    /**
     * The family name of the font to use. This corresponds with the
     * `Typographic Family Name` (Name ID 16) in the name table of the font. If
     * no such entry exists, the `Font Family Name` (Name ID 1) is to be used
     * instead. If there are multiple entries for the name, the english entry is
     * the one to choose. The subfamily is not specified at all and instead a
     * suitable subfamily is chosen based on the style, weight and stretch
     * values. https://docs.microsoft.com/en-us/typography/opentype/spec/name
     *
     * This is to ensure the highest portability across various platforms.
     * Platforms often select fonts very differently, so if necessary it is also
     * fine to store a different font identifier here at the cost of sacrificing
     * portability.
     */
    family: string;
    /** The style of the font to prefer selecting. */
    style: FontStyle;
    /** The weight of the font to prefer selecting. */
    weight: FontWeight;
    /** The stretch of the font to prefer selecting. */
    stretch: FontStretch;
}
/**
 * The style specifies whether to use a normal or italic version of a font. The
 * style may be emulated if no font dedicated to the style can be found.
 */
export type FontStyle = "normal" | "italic";
/**
 * The weight specifies the weight / boldness of a font. If there is no font
 * with the exact weight value, a font with a similar weight is to be chosen
 * based on an algorithm similar to this:
 * https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#Fallback_weights
 */
export type FontWeight = "thin" | "extra-light" | "light" | "semi-light" | "normal" | "medium" | "semi-bold" | "bold" | "extra-bold" | "black" | "extra-black";
/**
 * The stretch specifies how wide a font should be. For example it may make
 * sense to reduce the stretch of a font to ensure split names are not cut off.
 * A font with a stretch value that is close is to be selected.
 * https://developer.mozilla.org/en-US/docs/Web/CSS/font-stretch#Font_face_selection
 */
export type FontStretch = "ultra-condensed" | "extra-condensed" | "condensed" | "semi-condensed" | "normal" | "semi-expanded" | "expanded" | "extra-expanded" | "ultra-expanded";
/**
 * A Timing Method describes which form of timing is used. This can either be
 * Real Time or Game Time.
 */
export declare enum TimingMethod {
    /**
     * Real Time is the unmodified timing that is as close to an atomic clock as
     * possible.
     */
    RealTime = 0,
    /**
     * Game Time describes the timing that is provided by the game that is being
     * run. This is entirely optional and may either be Real Time with loading
     * times removed or some time provided by the game.
     */
    GameTime = 1
}
/**
 * Describes which phase the timer is currently in. This tells you if there's an
 * active speedrun attempt and whether it is paused or it ended.
 */
export declare enum TimerPhase {
    /** There's currently no active attempt. */
    NotRunning = 0,
    /** There's an active attempt that didn't end yet and isn't paused. */
    Running = 1,
    /** There's an attempt that already ended, but didn't get reset yet. */
    Ended = 2,
    /** There's an active attempt that is currently paused. */
    Paused = 3
}
/** An event informs you about a change in the timer. */
export declare enum Event {
    /** The timer has been started. */
    Started = 0,
    /**
     * A split happened. Note that the final split is signaled by `Finished`.
     */
    Splitted = 1,
    /**
     * The final split happened, the run is now finished, but has not been reset
     * yet.
     */
    Finished = 2,
    /** The timer has been reset. */
    Reset = 3,
    /** The previous split has been undone. */
    SplitUndone = 4,
    /** The current split has been skipped. */
    SplitSkipped = 5,
    /** The timer has been paused. */
    Paused = 6,
    /** The timer has been resumed. */
    Resumed = 7,
    /** All the pauses have been undone. */
    PausesUndone = 8,
    /** All the pauses have been undone and the timer has been resumed. */
    PausesUndoneAndResumed = 9,
    /** The comparison has been changed. */
    ComparisonChanged = 10,
    /** The timing method has been changed. */
    TimingMethodChanged = 11,
    /** The game time has been initialized. */
    GameTimeInitialized = 12,
    /** The game time has been set. */
    GameTimeSet = 13,
    /** The game time has been paused. */
    GameTimePaused = 14,
    /** The game time has been resumed. */
    GameTimeResumed = 15,
    /** The loading times have been set. */
    LoadingTimesSet = 16,
    /** A custom variable has been set. */
    CustomVariableSet = 17
}
/** An error that occurred when a command was being processed. */
export declare enum CommandError {
    /** The operation is not supported. */
    Unsupported = -1,
    /** The timer can't be interacted with at the moment. */
    Busy = -2,
    /** There is already a run in progress. */
    RunAlreadyInProgress = -3,
    /** There is no run in progress. */
    NoRunInProgress = -4,
    /** The run is already finished. */
    RunFinished = -5,
    /** The time is negative, you can't split yet. */
    NegativeTime = -6,
    /** The last split can't be skipped. */
    CantSkipLastSplit = -7,
    /** There is no split to undo. */
    CantUndoFirstSplit = -8,
    /** The timer is already paused. */
    AlreadyPaused = -9,
    /** The timer is not paused. */
    NotPaused = -10,
    /** The requested comparison doesn't exist. */
    ComparisonDoesntExist = -11,
    /** The game time is already initialized. */
    GameTimeAlreadyInitialized = -12,
    /** The game time is already paused. */
    GameTimeAlreadyPaused = -13,
    /** The game time is not paused. */
    GameTimeNotPaused = -14,
    /** The time could not be parsed. */
    CouldNotParseTime = -15,
    /** The timer is currently paused. */
    TimerPaused = -16,
    /** The runner decided to not reset the run. */
    RunnerDecidedAgainstReset = -17
}
/** The result of a command that was processed. */
export type CommandResult = Event | CommandError;
/**
 * Checks if the result of a command is a successful event instead of an error.
 */
export declare function isEvent(result: CommandResult): result is Event;
/** The state object describes the information to visualize for this component. */
export interface BlankSpaceComponentStateJson {
    /** The background shown behind the component. */
    background: Gradient;
    /** The size of the component. */
    size: number;
}
/** The state object describes the information to visualize for this component. */
export interface TimerComponentStateJson {
    /** The background shown behind the component. */
    background: Gradient;
    /** The time shown by the component without the fractional part. */
    time: string;
    /** The fractional part of the time shown (including the dot). */
    fraction: string;
    /** The semantic coloring information the time carries. */
    semantic_color: SemanticColor;
    /** The top color of the timer's gradient. */
    top_color: Color;
    /** The bottom color of the timer's gradient. */
    bottom_color: Color;
    /** The height of the timer. */
    height: number;
    /**
     * This value indicates whether the timer is currently frequently being
     * updated. This can be used for rendering optimizations.
     */
    updates_frequently: boolean;
}
/** The state object describes the information to visualize for this component. */
export interface TitleComponentStateJson {
    /** The background shown behind the component. */
    background: Gradient;
    /**
     * The color of the text. If `null` is specified, the color is taken from
     * the layout.
     */
    text_color: Color | null;
    /**
     * The game icon to show. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon: ImageId;
    /**
     * The first title line to show. This is either the game's name, or a
     * combination of the game's name and the category. This is a list of all
     * the possible abbreviations. It contains at least one element and the last
     * element is the unabbreviated value.
     */
    line1: string[];
    /**
     * By default the category name is shown on the second line. Based on the
     * settings, it can however instead be shown in a single line together with
     * the game name. This is a list of all the possible abbreviations. If this
     * is empty, only a single line is supposed to be shown. If it contains at
     * least one element, the last element is the unabbreviated value.
     */
    line2: string[];
    /**
     * Specifies whether the title should centered or aligned to the left
     * instead.
     */
    is_centered: boolean;
    /**
     * The amount of successfully finished attempts. If `null` is specified, the
     * amount of successfully finished attempts isn't supposed to be shown.
     */
    finished_runs: number | null;
    /**
     * The amount of total attempts. If `null` is specified, the amount of total
     * attempts isn't supposed to be shown.
     */
    attempts: number | null;
}
/** The state object describes the information to visualize for this component. */
export interface SplitsComponentStateJson {
    /** The background shown behind the splits. */
    background: ListGradient;
    /**
     * The column labels to visualize about the list of splits. If this is
     * `null`, no labels are supposed to be visualized. The list is specified
     * from right to left.
     */
    column_labels: string[] | null;
    /** The list of all the segments to visualize. */
    splits: SplitStateJson[];
    /**
     * Specifies whether the current run has any icons, even those that are not
     * currently visible by the splits component. This allows for properly
     * indenting the icon column, even when the icons are scrolled outside the
     * splits component.
     */
    has_icons: boolean;
    /**
     * Specifies whether thin separators should be shown between the individual
     * segments shown by the component.
     */
    show_thin_separators: boolean;
    /**
     * Specifies whether to display each split as two rows, with the segment
     * name being in one row and the times being in the other.
     */
    display_two_rows: boolean;
    /**
     * The gradient to show behind the current segment as an indicator of it
     * being the current segment.
     */
    current_split_gradient: Gradient;
}
/** The state object that describes a single segment's information to visualize. */
export interface SplitStateJson {
    /**
     * The icon of the segment. The associated image can be looked up in the
     * image cache. The image may be the empty image. This indicates that there
     * is no icon.
     */
    icon: ImageId;
    /** The name of the segment. */
    name: string;
    /**
     * The state of each column from right to left. The amount of columns is
     * not guaranteed to be the same across different splits.
     */
    columns: SplitColumnState[];
    /**
     * Describes if this segment is the segment the active attempt is currently
     * on.
     */
    is_current_split: boolean;
    /**
     * Describes if this segment is the segment selected by manually scrolling
     * through subsplit groups.
     */
    is_scrolled_to_split: boolean;
    /** Specifies whether this row should be indented. */
    is_indented: boolean;
    /**
     * Specifies whether a more pronounced separator should be shown before
     * this row because one or more logical rows preceding it are not visible.
     */
    show_separator_before: boolean;
    /**
     * The visual section this row belongs to. This is used for alternating
     * backgrounds when multiple flat segments collapse into a single section.
     */
    section_index: number;
    /**
     * The stable identity of this visual row. For segment rows this is the
     * index of the segment in the run. Synthetic group headers and blank rows
     * use reserved values instead. This may differ from the index of this
     * `SplitStateJson` in the `SplitsComponentStateJson` object, as there can
     * be a scrolling window showing only a subset of rows. Each index is
     * guaranteed to be unique.
     */
    index: number;
}
/** Describes the state of a single segment's column to visualize. */
export interface SplitColumnState {
    /** The value shown in the column. */
    value: string;
    /** The semantic coloring information the value carries. */
    semantic_color: SemanticColor;
    /** The visual color of the value. */
    visual_color: Color;
    /**
     * This value indicates whether the column is currently frequently being
     * updated. This can be used for rendering optimizations.
     */
    updates_frequently: boolean;
}
/**
 * The state object describes the information to visualize for a key value based
 * component.
 */
export interface KeyValueComponentStateJson {
    /** The background shown behind the component. */
    background: Gradient;
    /**
     * The color of the key. If `null` is specified, the color is taken from the
     * layout.
     */
    key_color: Color | null;
    /**
     * The color of the key. If `null` is specified, the color is taken from the
     * layout.
     */
    value_color: Color | null;
    /** The semantic coloring information the value carries. */
    semantic_color: SemanticColor;
    /** The key to visualize. */
    key: string;
    /** The value to visualize. */
    value: string;
    /**
     * Specifies additional abbreviations for the key that can be used instead
     * of the key, if there is not enough space to show the whole key.
     */
    key_abbreviations: string[];
    /**
     * Specifies whether to display the name of the component and its value in
     * two separate rows.
     */
    display_two_rows: boolean;
    /**
     * This value indicates whether the value is currently frequently being
     * updated. This can be used for rendering optimizations.
     */
    updates_frequently: boolean;
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export interface GraphComponentStateJson {
    /**
     * All of the graph's points. Connect all of them to visualize the graph. If
     * the live delta is active, the last point is to be interpreted as a
     * preview of the next split that is about to happen. Use the partial fill
     * color to visualize the region beneath that graph segment.
     */
    points: GraphComponentStatePointJson[];
    /** Contains the y coordinates of all the horizontal grid lines. */
    horizontal_grid_lines: number[];
    /** Contains the x coordinates of all the vertical grid lines. */
    vertical_grid_lines: number[];
    /**
     * The y coordinate that separates the region that shows the times that are
     * ahead of the comparison and those that are behind.
     */
    middle: number;
    /**
     * If the live delta is active, the last point is to be interpreted as a
     * preview of the next split that is about to happen. Use the partial fill
     * color to visualize the region beneath that graph segment.
     */
    is_live_delta_active: boolean;
    /**
     * Describes whether the graph is flipped vertically. For visualizing the
     * graph, this usually doesn't need to be interpreted, as this information
     * is entirely encoded into the other variables.
     */
    is_flipped: boolean;
    /**
     * The background color to use for the top region of the graph. The top
     * region ends at the y coordinate of the middle.
     */
    top_background_color: Color;
    /**
     * The background color to use for the bottom region of the graph. The top
     * region begins at the y coordinate of the middle.
     */
    bottom_background_color: Color;
    /** The color of the grid lines on the graph. */
    grid_lines_color: Color;
    /** The color of the lines connecting all the graph's points. */
    graph_lines_color: Color;
    /**
     * The color of the polygon connecting all the graph's points. The partial
     * fill color is only used for live changes.
     */
    partial_fill_color: Color;
    /** The color of the polygon connecting all the graph's points. */
    complete_fill_color: Color;
    /**
     * The best segment color to use for coloring graph segments that achieved a
     * new best segment time.
     */
    best_segment_color: Color;
    /** The height of the graph. */
    height: number;
}
/** Describes a point on the graph to visualize. */
export interface GraphComponentStatePointJson {
    /** The x coordinate of the point. */
    x: number;
    /** The y coordinate of the point. */
    y: number;
    /**
     * Describes whether the segment this point is visualizing achieved a new
     * best segment time. Use the best segment color for it, in that case.
     */
    is_best_segment: boolean;
}
/** The state object describes the information to visualize for this component. */
export interface TextComponentStateJson {
    /** The background shown behind the component. */
    background: Gradient;
    /**
     * Specifies whether to display the left and right text is supposed to be
     * displayed as two rows.
     */
    display_two_rows: boolean;
    /**
     * The color of the left part of the split up text or the whole text if
     * it's not split up. If null is specified, the color is taken from the
     * layout.
     */
    left_center_color: Color | null;
    /**
     * The color of the right part of the split up text. This can be ignored if
     * the text is not split up. If `null` is specified, the color is taken
     * from the layout.
     */
    right_color: Color | null;
    /** The text to show for the component. */
    text: TextComponentStateText;
}
/** The text that is supposed to be shown. */
export type TextComponentStateText = {
    Center: string;
} | {
    Split: string[];
};
/** The state object describes the information to visualize for this component. */
export interface DetailedTimerComponentStateJson {
    /** The background shown behind the component. */
    background: Gradient;
    /** The state of the attempt timer. */
    timer: TimerComponentStateJson;
    /** The state of the segment timer. */
    segment_timer: TimerComponentStateJson;
    /** The first comparison to visualize. */
    comparison1: DetailedTimerComponentComparisonStateJson | null;
    /** The second comparison to visualize. */
    comparison2: DetailedTimerComponentComparisonStateJson | null;
    /** Configured comparison names and maximum known segment-time formats. */
    comparison_size_hints: [DetailedTimerComponentComparisonSizeHintJson | null, DetailedTimerComponentComparisonSizeHintJson | null];
    /**
     * The name of the segment. This may be `null` if it's not supposed to be
     * visualized.
     */
    segment_name: string | null;
    /** Run-wide names and icon presence, used to reserve stable timer geometry. */
    segment_name_size_hints: DetailedTimerComponentSegmentNameSizeHintJson[];
    /** The shortest whole-time format, with normalized digits. */
    timer_minimum_size_hint: string;
    /**
     * The icon of the segment. The associated image can be looked up in the
     * image cache. The image may be the empty image. This indicates that there
     * is no icon.
     */
    icon: ImageId;
    /** Specifies how the segment icon should be displayed. */
    display_icon: IconDisplayMode;
    /**
     * The color of the segment name if it's shown. If `null` is specified, the
     * color is taken from the layout.
     */
    segment_name_color: Color | null;
    /**
     * The color of the comparison names if they are shown. If `null` is
     * specified, the color is taken from the layout.
     */
    comparison_names_color: Color | null;
    /**
     * The color of the comparison times if they are shown. If `null` is
     * specified, the color is taken from the layout.
     */
    comparison_times_color: Color | null;
}
/** The state object describing a comparison to visualize. */
export interface DetailedTimerComponentComparisonStateJson {
    /** The name of the comparison. */
    name: string;
    /** The time to show for the comparison. */
    time: string;
}
/** A configured comparison's reservation, also available before an attempt. */
export interface DetailedTimerComponentComparisonSizeHintJson {
    /** The displayed comparison name. */
    name: string;
    /** The largest known segment-time format, with normalized digits. */
    time: string;
}
/** A run-wide name reservation, including its ability to reclaim icon space. */
export interface DetailedTimerComponentSegmentNameSizeHintJson {
    /** The segment's name. */
    name: string;
    /** Whether the segment has an icon. */
    has_icon: boolean;
}
/**
 * Represents the current state of the Layout Editor in order to visualize it
 * properly.
 */
export interface LayoutEditorStateJson {
    /** The name of all the components in the layout, including those nested
     * inside groups. */
    components: string[];
    /** The indentation level of each component (0 = top level, 1 = inside a
     * group, etc.). */
    indent_levels: number[];
    /** Whether each component is an empty group placeholder. */
    is_placeholder: boolean[];
    /** Describes which actions are currently available. */
    buttons: LayoutEditorButtonsJson;
    /** The flat index of the currently selected component. */
    selected_component: number;
    /**
     * The layout direction at the selected component's position. This is the
     * direction of the container that the selected component belongs to. A
     * component added at this position would be laid out in this direction. For
     * example, in a vertical root layout this is "Vertical" at the top level.
     * Adding a group here creates a row (horizontal), adding a row's
     * placeholder creates a column (vertical), and so on.
     */
    layout_direction: LayoutDirection;
    /**
     * A generic description of the settings available for the selected
     * component and their current values.
     */
    component_settings: SettingsDescriptionJson;
    /**
     * A generic description of the general settings available for the layout
     * and their current values.
     */
    general_settings: SettingsDescriptionJson;
}
/**
 * Describes which actions are currently available. Depending on how many
 * components exist and which one is selected, only some actions can be executed
 * successfully.
 */
export interface LayoutEditorButtonsJson {
    /**
     * Describes whether the currently selected component can be removed. If
     * there's only one component in the layout, it can't be removed.
     */
    can_remove: boolean;
    /**
     * Describes whether the currently selected component can be moved up. If
     * the first component is selected, it can't be moved.
     */
    can_move_up: boolean;
    /**
     * Describes whether the currently selected component can be moved down. If
     * the last component is selected, it can't be moved.
     */
    can_move_down: boolean;
    /**
     * Describes whether the currently selected component can be duplicated.
     * Placeholders can't be duplicated.
     */
    can_duplicate: boolean;
}
/** A generic description of the settings available and their current values. */
export interface SettingsDescriptionJson {
    /**
     * All of the different settings that are available and their current
     * values.
     */
    fields: SettingsDescriptionFieldJson[];
}
/** A Field describes a single setting by its name and its current value. */
export interface SettingsDescriptionFieldJson {
    /** The name of the setting. */
    text: string;
    /** The tooltip to show for the setting. */
    tooltip: string;
    /** An optional hint about how to display the setting. */
    hint?: "Comparison" | "CustomVariable";
    /** The current value of the setting. */
    value: SettingsDescriptionValueJson;
}
/**
 * Describes a setting's value. Such a value can be of a variety of different
 * types.
 */
export type SettingsDescriptionValueJson = {
    Bool: boolean;
} | {
    UInt: number;
} | {
    OptionalUInt: number | null;
} | {
    Int: number;
} | {
    String: string;
} | {
    OptionalString: string | null;
} | {
    Accuracy: AccuracyJson;
} | {
    DigitsFormat: DigitsFormatJson;
} | {
    OptionalTimingMethod: TimingMethodJson | null;
} | {
    Color: Color;
} | {
    OptionalColor: Color | null;
} | {
    Gradient: Gradient;
} | {
    ListGradient: ListGradient;
} | {
    Alignment: Alignment;
} | {
    ColumnKind: ColumnKind;
} | {
    ColumnStartWith: ColumnStartWith;
} | {
    ColumnUpdateWith: ColumnUpdateWith;
} | {
    ColumnUpdateTrigger: ColumnUpdateTrigger;
} | {
    SubsplitDisplayMode: SubsplitDisplayMode;
} | {
    IconDisplayMode: IconDisplayMode;
} | {
    Hotkey: string;
} | {
    LayoutDirection: LayoutDirection;
} | {
    Font: Font | null;
} | {
    DeltaGradient: DeltaGradient;
} | {
    LayoutBackground: LayoutBackground;
} | {
    CustomCombobox: CustomCombobox;
};
/** Describes the kind of a column. */
export type ColumnKind = "Time" | "Variable";
/** Represents the possible backgrounds for a timer. */
export type DeltaGradient = Gradient | "DeltaPlain" | "DeltaVertical" | "DeltaHorizontal";
/** Describes the direction the components of a layout are laid out in. */
export type LayoutDirection = "Vertical" | "Horizontal";
/**
 * A custom Combobox containing its current value and a list of possible
 * values.
 */
export interface CustomCombobox {
    value: string;
    list: string[] | [string, string][];
    mandatory: boolean;
}
/**
 * Specifies the value a segment starts out with before it gets replaced
 * with the current attempt's information when splitting.
 */
export type ColumnStartWith = "Empty" | "ComparisonTime" | "ComparisonSegmentTime" | "PossibleTimeSave";
/**
 * Once a certain condition is met, which is usually being on the split or
 * already having completed the split, the time gets updated with the value
 * specified here.
 */
export type ColumnUpdateWith = "DontUpdate" | "SplitTime" | "Delta" | "DeltaWithFallback" | "SegmentTime" | "SegmentDelta" | "SegmentDeltaWithFallback";
/** Specifies when a column's value gets updated. */
export type ColumnUpdateTrigger = "OnStartingSegment" | "Contextual" | "OnEndingSegment";
/** Describes how native subsplits are displayed. */
export type SubsplitDisplayMode = "Flat" | "CurrentGroupExpanded" | "AllGroupsExpanded";
/** Describes how the Detailed Timer Component's icon is displayed. */
export type IconDisplayMode = "Hidden" | "BothRows" | "FirstRow";
/**
 * The Accuracy describes how many digits to show for the fractional part of a
 * time.
 */
export type AccuracyJson = "Seconds" | "Tenths" | "Hundredths" | "Milliseconds";
/**
 * A Timing Method describes which form of timing is used. This can either be
 * Real Time or Game Time.
 */
export type TimingMethodJson = "RealTime" | "GameTime";
/**
 * A Digits Format describes how many digits of a time to always shown. The
 * times are prefixed by zeros to fill up the remaining digits.
 */
export type DigitsFormatJson = "SingleDigitSeconds" | "DoubleDigitSeconds" | "SingleDigitMinutes" | "DoubleDigitMinutes" | "SingleDigitHours" | "DoubleDigitHours";
/**
 * Represents the current state of the Run Editor in order to visualize it
 * properly.
 */
export interface RunEditorStateJson {
    /**
     * The game icon of the run. The associated image can be looked up in the
     * image cache. The image may be the empty image. This indicates that there
     * is no icon.
     */
    icon: ImageId;
    /** The name of the game the Run is for. */
    game: string;
    /** The name of the category the Run is for. */
    category: string;
    /**
     * The timer offset specifies the time that the timer starts at when starting a
     * new attempt.
     */
    offset: string;
    /**
     * The number of times this Run has been attempted by the runner. This
     * is mostly just a visual number and has no effect on any history.
     */
    attempts: number;
    /**
     * The timing method that is currently selected to be visualized and
     * edited.
     */
    timing_method: TimingMethodJson;
    /**
     * The rows of the editor in presentation order. Segment group headers are
     * included directly before their segments so consumers don't need to
     * reconstruct the visual hierarchy from the run's canonical group ranges.
     */
    rows: RunEditorRowJson[];
    /** The names of all the custom comparisons that exist for this Run. */
    comparison_names: string[];
    /** Describes which actions are currently available. */
    buttons: RunEditorButtonsJson;
    /**
     * Additional metadata of this Run, like the platform and region of the
     * game.
     */
    metadata: RunMetadataJson;
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export interface RunMetadataJson {
    /**
     * The speedrun.com Run ID of the run. You need to ensure that the record
     * on speedrun.com matches up with the Personal Best of this run. This may
     * be empty if there's no association.
     */
    run_id: string;
    /**
     * The name of the platform this game is run on. This may be empty if it's
     * not specified.
     */
    platform_name: string;
    /**
     * Specifies whether this speedrun is done on an emulator. Keep in mind
     * that `false` may also mean that this information is simply not known.
     */
    uses_emulator: boolean;
    /**
     * The name of the region this game is from. This may be empty if it's not
     * specified.
     */
    region_name: string;
    /**
     * Stores all the speedrun.com variables. A variable is an arbitrary key
     * value pair storing additional information about the category. An example
     * of this may be whether Amiibos are used in this category.
     */
    speedrun_com_variables: {
        [key: string]: string | undefined;
    };
    /**
     * Stores all the custom variables. A custom variable is a key value pair
     * storing additional information about a run. Unlike the speedrun.com
     * variables, these can be fully custom and don't need to correspond to
     * anything on speedrun.com. Permanent custom variables can be specified by
     * the runner. Additionally auto splitters or other sources may provide
     * temporary custom variables that are not stored in the splits files.
     */
    custom_variables: {
        [key: string]: CustomVariableJson | undefined;
    };
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export interface CustomVariableJson {
    /**
     * The current value of the custom variable. This may be provided by the
     * runner in the run editor or it may be provided through other means such
     * as an auto splitter.
     */
    value: string;
    /**
     * States whether the variable is permanent. Temporary variables don't get
     * stored in splits files. They also don't get shown in the run editor.
     */
    is_permanent: boolean;
}
/**
 * Describes which actions are currently available. Depending on how many
 * segments exist and which ones are selected, only some actions can be
 * executed successfully.
 */
export interface RunEditorButtonsJson {
    /**
     * Describes whether the currently selected segments can be removed. If all
     * segments are selected, they can't be removed.
     */
    can_remove: boolean;
    /**
     * Describes whether the currently selected segments can be moved up. If
     * any one of the selected segments is the first segment, then they can't
     * be moved.
     */
    can_move_up: boolean;
    /**
     * Describes whether the currently selected segments can be moved down. If
     * any one of the selected segments is the last segment, then they can't be
     * moved.
     */
    can_move_down: boolean;
    /**
     * Describes whether the currently selected segments can be turned into a
     * segment group.
     */
    can_create_segment_group: boolean;
    /**
     * Describes whether the currently selected segments are exactly one or more
     * segment groups that can be removed.
     */
    can_remove_segment_groups: boolean;
}
/** Describes a row in the Run Editor's unified presentation model. */
export type RunEditorRowJson = RunEditorSegmentRowJson | RunEditorSegmentGroupRowJson;
/** Describes the current state of a segment row. */
export interface RunEditorSegmentRowJson {
    /** Identifies this row as an individual segment. */
    kind: "Segment";
    /**
     * The index of the segment in the run. Presentation row indices differ
     * whenever group headers are present, so mutations must use this index.
     */
    segment_index: number;
    /**
     * The icon of the segment. The associated image can be looked up in the
     * image cache. The image may be the empty image. This indicates that there
     * is no icon.
     */
    icon: ImageId;
    /** The name of the segment. */
    name: string;
    /** The segment's split time for the active timing method. */
    split_time: string;
    /** The segment time for the active timing method. */
    segment_time: string;
    /** The best segment time for the active timing method. */
    best_segment_time: string;
    /**
     * All of the times of the custom comparison for the active timing method.
     * The order of these matches up with the order of the custom comparisons
     * provided by the Run Editor's State object.
     */
    comparison_times: string[];
    /** Describes the segment's selection state. */
    selected: "NotSelected" | "Selected" | "Active";
    /** Whether the segment is visually nested beneath a group header. */
    is_indented: boolean;
    /** Whether a visual section boundary starts immediately before this row. */
    starts_new_section: boolean;
}
/** Describes a segment group header row. */
export interface RunEditorSegmentGroupRowJson {
    /** Identifies this row as a segment group header. */
    kind: "SegmentGroup";
    /** The index of the group in the run. */
    group_index: number;
    /** The resolved display name, falling back to the final segment's name. */
    name: string;
    /**
     * The explicitly configured group name. This remains separate from `name`
     * so an editor can present the inherited name as a placeholder.
     */
    explicit_name: string | null;
    /**
     * The group display icon. This falls back to the final segment's icon if no
     * explicit group icon is set.
     */
    icon: ImageId;
    /** Whether the group icon is explicitly set instead of inherited. */
    has_explicit_icon: boolean;
    /** Whether every segment in the group is currently selected. */
    selected: boolean;
}
/**
 * A Semantic Color describes a color by some meaningful event that is
 * happening. This information can be visualized as a color, but can also be
 * interpreted in other ways by the consumer of this API.
 */
export type SemanticColor = "Default" | "AheadGainingTime" | "AheadLosingTime" | "BehindLosingTime" | "BehindGainingTime" | "BestSegment" | "NotRunning" | "Paused" | "PersonalBest";
/**
 * The Language enum describes all the languages that are supported for
 * localization.
 */
export declare enum Language {
    English = 0,
    Dutch = 1,
    French = 2,
    German = 3,
    Italian = 4,
    Portuguese = 5,
    Polish = 6,
    Russian = 7,
    Spanish = 8,
    BrazilianPortuguese = 9,
    ChineseSimplified = 10,
    ChineseTraditional = 11,
    Japanese = 12,
    Korean = 13
}
/**
 * An Atomic Date Time represents a UTC Date Time that tries to be as close to
 * an atomic clock as possible.
 */
export declare class AtomicDateTimeRef {
    ptr: number;
    /**
     * Represents whether the date time is actually properly derived from an
     * atomic clock. If the synchronization with the atomic clock didn't happen
     * yet or failed, this is set to false.
     */
    isSynchronized(): boolean;
    /**
     * Converts this atomic date time into a RFC 3339 formatted date time.
     */
    toRfc3339(): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * An Atomic Date Time represents a UTC Date Time that tries to be as close to
 * an atomic clock as possible.
 */
export declare class AtomicDateTimeRefMut extends AtomicDateTimeRef {
}
/**
 * An Atomic Date Time represents a UTC Date Time that tries to be as close to
 * an atomic clock as possible.
 */
export declare class AtomicDateTime extends AtomicDateTimeRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * An Attempt describes information about an attempt to run a specific category
 * by a specific runner in the past. Every time a new attempt is started and
 * then reset, an Attempt describing general information about it is created.
 */
export declare class AttemptRef {
    ptr: number;
    /**
     * Accesses the unique index of the attempt. This index is unique for the
     * Run, not for all of them.
     */
    index(): number;
    /**
     * Accesses the split time of the last segment. If the attempt got reset
     * early and didn't finish, this may be empty.
     */
    time(): TimeRef;
    /**
     * Accesses the amount of time the attempt has been paused for. If it is not
     * known, this returns null. This means that it may not necessarily be
     * possible to differentiate whether a Run has not been paused or it simply
     * wasn't stored.
     */
    pauseTime(): TimeSpanRef | null;
    /**
     * Accesses the point in time the attempt was started at. This returns null
     * if this information is not known.
     */
    started(): AtomicDateTime | null;
    /**
     * Accesses the point in time the attempt was ended at. This returns null if
     * this information is not known.
     */
    ended(): AtomicDateTime | null;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * An Attempt describes information about an attempt to run a specific category
 * by a specific runner in the past. Every time a new attempt is started and
 * then reset, an Attempt describing general information about it is created.
 */
export declare class AttemptRefMut extends AttemptRef {
}
/**
 * An Attempt describes information about an attempt to run a specific category
 * by a specific runner in the past. Every time a new attempt is started and
 * then reset, an Attempt describing general information about it is created.
 */
export declare class Attempt extends AttemptRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Blank Space Component is simply an empty component that doesn't show
 * anything other than a background. It mostly serves as padding between other
 * components.
 */
export declare class BlankSpaceComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Blank Space Component is simply an empty component that doesn't show
 * anything other than a background. It mostly serves as padding between other
 * components.
 */
export declare class BlankSpaceComponentRefMut extends BlankSpaceComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(): any;
    /**
     * Calculates the component's state.
     */
    state(): BlankSpaceComponentState;
}
/**
 * The Blank Space Component is simply an empty component that doesn't show
 * anything other than a background. It mostly serves as padding between other
 * components.
 */
export declare class BlankSpaceComponent extends BlankSpaceComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Blank Space Component.
     */
    static new(): BlankSpaceComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class BlankSpaceComponentStateRef {
    ptr: number;
    /**
     * The size of the component.
     */
    size(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class BlankSpaceComponentStateRefMut extends BlankSpaceComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class BlankSpaceComponentState extends BlankSpaceComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A Carousel Component cycles through its child components one at a time,
 * periodically switching to the next child after a configurable interval.
 */
export declare class CarouselComponentRef {
    ptr: number;
    /**
     * Returns the number of components in the carousel.
     */
    len(): number;
    /**
     * Returns the size override of the carousel. 0xFFFFFFFF means automatic
     * sizing.
     */
    size(): number;
    /**
     * Returns the interval in seconds between switching to the next child.
     */
    interval(): BigInt;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Carousel Component cycles through its child components one at a time,
 * periodically switching to the next child after a configurable interval.
 */
export declare class CarouselComponentRefMut extends CarouselComponentRef {
    /**
     * Adds a component to the end of the carousel.
     */
    addComponent(component: Component): void;
    /**
     * Sets the size override of the carousel. 0xFFFFFFFF means automatic
     * sizing.
     */
    setSize(size: number): void;
}
/**
 * A Carousel Component cycles through its child components one at a time,
 * periodically switching to the next child after a configurable interval.
 */
export declare class CarouselComponent extends CarouselComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new empty Carousel Component.
     */
    static new(): CarouselComponent;
    /**
     * Converts the Carousel Component into a generic component suitable for using
     * with a layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class CarouselComponentStateRef {
    ptr: number;
    /**
     * Returns the number of components in a Carousel State.
     */
    len(): number;
    /**
     * Returns a string describing the type of the component at the specified
     * index within a Carousel State.
     */
    componentType(index: number): string;
    /**
     * Returns the size override of a Carousel State. 0xFFFFFFFF means automatic
     * sizing.
     */
    size(): number;
    /**
     * Returns the index of the currently visible component.
     */
    currentIndex(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class CarouselComponentStateRefMut extends CarouselComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class CarouselComponentState extends CarouselComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A Component provides information about a run in a way that is easy to
 * visualize. This type can store any of the components provided by this crate.
 */
export declare class ComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Component provides information about a run in a way that is easy to
 * visualize. This type can store any of the components provided by this crate.
 */
export declare class ComponentRefMut extends ComponentRef {
}
/**
 * A Component provides information about a run in a way that is easy to
 * visualize. This type can store any of the components provided by this crate.
 */
export declare class Component extends ComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Current Comparison Component is a component that shows the name of the
 * comparison that is currently selected to be compared against.
 */
export declare class CurrentComparisonComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Current Comparison Component is a component that shows the name of the
 * comparison that is currently selected to be compared against.
 */
export declare class CurrentComparisonComponentRefMut extends CurrentComparisonComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
}
/**
 * The Current Comparison Component is a component that shows the name of the
 * comparison that is currently selected to be compared against.
 */
export declare class CurrentComparisonComponent extends CurrentComparisonComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Current Comparison Component.
     */
    static new(): CurrentComparisonComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The Current Pace Component is a component that shows a prediction of the
 * current attempt's final time, if the current attempt's pace matches the
 * chosen comparison for the remainder of the run.
 */
export declare class CurrentPaceComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Current Pace Component is a component that shows a prediction of the
 * current attempt's final time, if the current attempt's pace matches the
 * chosen comparison for the remainder of the run.
 */
export declare class CurrentPaceComponentRefMut extends CurrentPaceComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
}
/**
 * The Current Pace Component is a component that shows a prediction of the
 * current attempt's final time, if the current attempt's pace matches the
 * chosen comparison for the remainder of the run.
 */
export declare class CurrentPaceComponent extends CurrentPaceComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Current Pace Component.
     */
    static new(): CurrentPaceComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The Delta Component is a component that shows how far ahead or behind the
 * current attempt is compared to the chosen comparison.
 */
export declare class DeltaComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Delta Component is a component that shows how far ahead or behind the
 * current attempt is compared to the chosen comparison.
 */
export declare class DeltaComponentRefMut extends DeltaComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer and the layout
     * settings provided.
     */
    state(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): KeyValueComponentState;
}
/**
 * The Delta Component is a component that shows how far ahead or behind the
 * current attempt is compared to the chosen comparison.
 */
export declare class DeltaComponent extends DeltaComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Delta Component.
     */
    static new(): DeltaComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The Detailed Timer Component is a component that shows two timers, one for
 * the total time of the current attempt and one showing the time of just the
 * current segment. Other information, like segment times of up to two
 * comparisons, the segment icon, and the segment's name, can also be shown.
 */
export declare class DetailedTimerComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Detailed Timer Component is a component that shows two timers, one for
 * the total time of the current attempt and one showing the time of just the
 * current segment. Other information, like segment times of up to two
 * comparisons, the segment icon, and the segment's name, can also be shown.
 */
export declare class DetailedTimerComponentRefMut extends DetailedTimerComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(imageCache: ImageCacheRefMut, timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer and layout settings
     * provided.
     */
    state(imageCache: ImageCacheRefMut, timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): DetailedTimerComponentState;
}
/**
 * The Detailed Timer Component is a component that shows two timers, one for
 * the total time of the current attempt and one showing the time of just the
 * current segment. Other information, like segment times of up to two
 * comparisons, the segment icon, and the segment's name, can also be shown.
 */
export declare class DetailedTimerComponent extends DetailedTimerComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Detailed Timer Component.
     */
    static new(): DetailedTimerComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class DetailedTimerComponentStateRef {
    ptr: number;
    /**
     * The time shown by the component's main timer without the fractional part.
     */
    timerTime(): string;
    /**
     * The fractional part of the time shown by the main timer (including the dot).
     */
    timerFraction(): string;
    /**
     * The semantic coloring information the main timer's time carries.
     */
    timerSemanticColor(): string;
    /**
     * The time shown by the component's segment timer without the fractional part.
     */
    segmentTimerTime(): string;
    /**
     * The fractional part of the time shown by the segment timer (including the
     * dot).
     */
    segmentTimerFraction(): string;
    /**
     * Returns whether the first comparison is visible.
     */
    comparison1Visible(): boolean;
    /**
     * Returns the name of the first comparison. You may not call this if the first
     * comparison is not visible.
     */
    comparison1Name(): string;
    /**
     * Returns the time of the first comparison. You may not call this if the first
     * comparison is not visible.
     */
    comparison1Time(): string;
    /**
     * Returns whether the second comparison is visible.
     */
    comparison2Visible(): boolean;
    /**
     * Returns the name of the second comparison. You may not call this if the
     * second comparison is not visible.
     */
    comparison2Name(): string;
    /**
     * Returns the time of the second comparison. You may not call this if the
     * second comparison is not visible.
     */
    comparison2Time(): string;
    /**
     * The icon of the segment. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon(): string;
    /**
     * Returns how the segment icon is displayed.
     */
    displayIcon(): string;
    /**
     * The name of the segment. This may be null if it's not supposed to be
     * visualized.
     */
    segmentName(): string | null;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class DetailedTimerComponentStateRefMut extends DetailedTimerComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class DetailedTimerComponentState extends DetailedTimerComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * With a Fuzzy List, you can implement a fuzzy searching algorithm. The list
 * stores all the items that can be searched for. With the `search` method you
 * can then execute the actual fuzzy search which returns a list of all the
 * elements found. This can be used to implement searching in a list of games.
 */
export declare class FuzzyListRef {
    ptr: number;
    /**
     * Searches for the pattern provided in the list. A list of all the
     * matching elements is returned. The returned list has a maximum amount of
     * elements provided to this method.
     */
    search(pattern: string, max: number): any;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * With a Fuzzy List, you can implement a fuzzy searching algorithm. The list
 * stores all the items that can be searched for. With the `search` method you
 * can then execute the actual fuzzy search which returns a list of all the
 * elements found. This can be used to implement searching in a list of games.
 */
export declare class FuzzyListRefMut extends FuzzyListRef {
    /**
     * Adds a new element to the list.
     */
    push(text: string): void;
}
/**
 * With a Fuzzy List, you can implement a fuzzy searching algorithm. The list
 * stores all the items that can be searched for. With the `search` method you
 * can then execute the actual fuzzy search which returns a list of all the
 * elements found. This can be used to implement searching in a list of games.
 */
export declare class FuzzyList extends FuzzyListRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Fuzzy List.
     */
    static new(): FuzzyList;
}
/**
 * The general settings of the layout that apply to all components.
 */
export declare class GeneralLayoutSettingsRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The general settings of the layout that apply to all components.
 */
export declare class GeneralLayoutSettingsRefMut extends GeneralLayoutSettingsRef {
}
/**
 * The general settings of the layout that apply to all components.
 */
export declare class GeneralLayoutSettings extends GeneralLayoutSettingsRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a default general layout settings configuration.
     */
    static default(): GeneralLayoutSettings;
}
/**
 * The Graph Component visualizes how far the current attempt has been ahead or
 * behind the chosen comparison throughout the whole attempt. All the
 * individual deltas are shown as points in a graph.
 */
export declare class GraphComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef): any;
    /**
     * Calculates the component's state based on the timer and layout settings
     * provided.
     */
    state(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef): GraphComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Graph Component visualizes how far the current attempt has been ahead or
 * behind the chosen comparison throughout the whole attempt. All the
 * individual deltas are shown as points in a graph.
 */
export declare class GraphComponentRefMut extends GraphComponentRef {
}
/**
 * The Graph Component visualizes how far the current attempt has been ahead or
 * behind the chosen comparison throughout the whole attempt. All the
 * individual deltas are shown as points in a graph.
 */
export declare class GraphComponent extends GraphComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Graph Component.
     */
    static new(): GraphComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export declare class GraphComponentStateRef {
    ptr: number;
    /**
     * Returns the amount of points to visualize. Connect all of them to visualize
     * the graph. If the live delta is active, the last point is to be interpreted
     * as a preview of the next split that is about to happen. Use the partial fill
     * color to visualize the region beneath that graph segment.
     */
    pointsLen(): number;
    /**
     * Returns the x coordinate of the point specified. You may not provide an out
     * of bounds index.
     */
    pointX(index: number): number;
    /**
     * Returns the y coordinate of the point specified. You may not provide an out
     * of bounds index.
     */
    pointY(index: number): number;
    /**
     * Describes whether the segment the point specified is visualizing achieved a
     * new best segment time. Use the best segment color for it, in that case. You
     * may not provide an out of bounds index.
     */
    pointIsBestSegment(index: number): boolean;
    /**
     * Describes how many horizontal grid lines to visualize.
     */
    horizontalGridLinesLen(): number;
    /**
     * Accesses the y coordinate of the horizontal grid line specified. You may not
     * provide an out of bounds index.
     */
    horizontalGridLine(index: number): number;
    /**
     * Describes how many vertical grid lines to visualize.
     */
    verticalGridLinesLen(): number;
    /**
     * Accesses the x coordinate of the vertical grid line specified. You may not
     * provide an out of bounds index.
     */
    verticalGridLine(index: number): number;
    /**
     * The y coordinate that separates the region that shows the times that are
     * ahead of the comparison and those that are behind.
     */
    middle(): number;
    /**
     * If the live delta is active, the last point is to be interpreted as a
     * preview of the next split that is about to happen. Use the partial fill
     * color to visualize the region beneath that graph segment.
     */
    isLiveDeltaActive(): boolean;
    /**
     * Describes whether the graph is flipped vertically. For visualizing the
     * graph, this usually doesn't need to be interpreted, as this information is
     * entirely encoded into the other variables.
     */
    isFlipped(): boolean;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export declare class GraphComponentStateRefMut extends GraphComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 * All the coordinates are in the range 0..1.
 */
export declare class GraphComponentState extends GraphComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A Component Group groups multiple components together and lays them out
 * in the opposite direction to the parent, enabling nested layout hierarchies.
 */
export declare class GroupComponentRef {
    ptr: number;
    /**
     * Returns the number of components in the group.
     */
    len(): number;
    /**
     * Returns the size override of the group. In horizontal mode this is the
     * height, in vertical mode it is the width. 0xFFFFFFFF means automatic sizing.
     */
    size(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Component Group groups multiple components together and lays them out
 * in the opposite direction to the parent, enabling nested layout hierarchies.
 */
export declare class GroupComponentRefMut extends GroupComponentRef {
    /**
     * Adds a component to the end of the group.
     */
    addComponent(component: Component): void;
    /**
     * Sets the size override of the group. In horizontal mode this sets the
     * height, in vertical mode it sets the width. 0xFFFFFFFF means automatic
     * sizing.
     */
    setSize(size: number): void;
}
/**
 * A Component Group groups multiple components together and lays them out
 * in the opposite direction to the parent, enabling nested layout hierarchies.
 */
export declare class GroupComponent extends GroupComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new empty Group Component.
     */
    static new(): GroupComponent;
    /**
     * Converts the Group Component into a generic component suitable for using
     * with a layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class GroupComponentStateRef {
    ptr: number;
    /**
     * Returns the number of components in a Group State.
     */
    len(): number;
    /**
     * Returns a string describing the type of the component at the specified
     * index within a Group State.
     */
    componentType(index: number): string;
    /**
     * Returns the size override of a Group State. In horizontal mode this is the
     * height, in vertical mode it is the width. 0xFFFFFFFF means automatic
     * sizing.
     */
    size(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class GroupComponentStateRefMut extends GroupComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class GroupComponentState extends GroupComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A cache for images that allows looking up images by their ID. The cache uses
 * a garbage collection algorithm to remove images that have not been visited
 * since the last garbage collection. Functions updating the cache usually
 * don't run the garbage collection themselves, so make sure to call `collect`
 * every now and then to remove unvisited images.
 */
export declare class ImageCacheRef {
    ptr: number;
    /**
     * Looks up an image in the cache based on its image ID and returns a pointer
     * to the bytes that make up the image. The bytes are the image in its original
     * file format. The format is not specified and can be any image format. The
     * data may not even represent a valid image at all. If the image is not in the
     * cache, null is returned. This does not mark the image as visited.
     */
    lookupDataPtr(key: string): number;
    /**
     * Looks up an image in the cache based on its image ID and returns its byte
     * length. If the image is not in the cache, 0 is returned. This does not mark
     * the image as visited.
     */
    lookupDataLen(key: string): number;
    /**
     * Looks up an image in the cache based on its image ID. The bytes are the image in its original
     * file format. The format is not specified and can be any image format. The
     * data may not even represent a valid image at all. If the image is not in the
     * cache, null is returned. This does not mark the image as visited.
     */
    lookupData(key: string): Uint8Array<ArrayBuffer> | undefined;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A cache for images that allows looking up images by their ID. The cache uses
 * a garbage collection algorithm to remove images that have not been visited
 * since the last garbage collection. Functions updating the cache usually
 * don't run the garbage collection themselves, so make sure to call `collect`
 * every now and then to remove unvisited images.
 */
export declare class ImageCacheRefMut extends ImageCacheRef {
    /**
     * Caches an image and returns its image ID. The image is provided as a byte
     * array. The image ID is the hash of the image data and can be used to look up
     * the image in the cache. The image is marked as visited in the cache. If you
     * specify that the image is large, it gets considered a large image that may
     * be used as a background image. Otherwise it gets considered an icon. The
     * image is resized according to this information.
     */
    cache(data: number, len: number, isLarge: boolean): string;
    /**
     * Runs the garbage collection of the cache. This removes images from the cache
     * that have not been visited since the last garbage collection. Not every
     * image that has not been visited is removed. There is a heuristic that keeps
     * a certain amount of images in the cache regardless of whether they have been
     * visited or not. Returns the amount of images that got collected.
     */
    collect(): number;
    cacheFromArray(data: Uint8Array, isLarge: boolean): string;
}
/**
 * A cache for images that allows looking up images by their ID. The cache uses
 * a garbage collection algorithm to remove images that have not been visited
 * since the last garbage collection. Functions updating the cache usually
 * don't run the garbage collection themselves, so make sure to call `collect`
 * every now and then to remove unvisited images.
 */
export declare class ImageCache extends ImageCacheRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new image cache.
     */
    static new(): ImageCache;
}
/**
 * The state object describes the information to visualize for a key value based component.
 */
export declare class KeyValueComponentStateRef {
    ptr: number;
    /**
     * The key to visualize.
     */
    key(): string;
    /**
     * The value to visualize.
     */
    value(): string;
    /**
     * The semantic coloring information the value carries.
     */
    semanticColor(): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for a key value based component.
 */
export declare class KeyValueComponentStateRefMut extends KeyValueComponentStateRef {
}
/**
 * The state object describes the information to visualize for a key value based component.
 */
export declare class KeyValueComponentState extends KeyValueComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * Localization bindings.
 */
export declare class LangRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * Localization bindings.
 */
export declare class LangRefMut extends LangRef {
}
/**
 * Localization bindings.
 */
export declare class Lang extends LangRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Parses a locale string into a language.
     */
    static parseLocale(locale: string): number;
    /**
     * Parses a language name into a language.
     */
    static fromName(name: string): number;
    /**
     * Returns the localized display name for a language.
     */
    static displayName(lang: number): string;
}
/**
 * A Layout allows you to combine multiple components together to visualize a
 * variety of information the runner is interested in.
 */
export declare class LayoutRef {
    ptr: number;
    /**
     * Clones the layout.
     */
    clone(): Layout;
    /**
     * Encodes the settings of the layout as JSON.
     */
    settingsAsJson(): any;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Layout allows you to combine multiple components together to visualize a
 * variety of information the runner is interested in.
 */
export declare class LayoutRefMut extends LayoutRef {
    /**
     * Calculates and returns the layout's state based on the timer provided.
     */
    state(imageCache: ImageCacheRefMut, timer: TimerRef, lang: number): LayoutState;
    /**
     * Updates the layout's state based on the timer provided.
     */
    updateState(state: LayoutStateRefMut, imageCache: ImageCacheRefMut, timer: TimerRef, lang: number): void;
    /**
     * Updates the layout's state based on the timer provided and encodes it as
     * JSON.
     */
    updateStateAsJson(state: LayoutStateRefMut, imageCache: ImageCacheRefMut, timer: TimerRef, lang: number): any;
    /**
     * Calculates the layout's state based on the timer provided and encodes it as
     * JSON. You can use this to visualize all of the components of a layout.
     */
    stateAsJson(imageCache: ImageCacheRefMut, timer: TimerRef, lang: number): any;
    /**
     * Adds a new component to the end of the layout.
     */
    push(component: Component): void;
    /**
     * Scrolls up all the components in the layout that can be scrolled up.
     */
    scrollUp(): void;
    /**
     * Scrolls down all the components in the layout that can be scrolled down.
     */
    scrollDown(): void;
}
/**
 * A Layout allows you to combine multiple components together to visualize a
 * variety of information the runner is interested in.
 */
export declare class Layout extends LayoutRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new empty layout with no components.
     */
    static new(): Layout;
    /**
     * Creates a new default layout that contains a default set of components
     * in order to provide a good default layout for runners. Which components
     * are provided by this and how they are configured may change in the
     * future.
     */
    static defaultLayout(lang: number): Layout;
    /**
     * Parses a layout from the given JSON description of its settings. null is
     * returned if it couldn't be parsed.
     */
    static parseJson(settings: any): Layout | null;
    /**
     * Parses a layout saved by the original LiveSplit. This is lossy, as not
     * everything can be converted completely. null is returned if it couldn't be
     * parsed at all.
     */
    static parseOriginalLivesplit(data: number, length: number): Layout | null;
    static parseOriginalLivesplitArray(data: Uint8Array): Layout | null;
    static parseOriginalLivesplitString(text: string): Layout | null;
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
export declare class LayoutStateRef {
    ptr: number;
    /**
     * Encodes the layout state as JSON. You can use this to visualize all of the
     * components of a layout.
     */
    asJson(): any;
    /**
     * Gets the number of Components in the Layout State.
     */
    len(): number;
    /**
     * Returns a string describing the type of the Component at the specified
     * index.
     */
    componentType(index: number): string;
    /**
     * Gets the Blank Space component state at the specified index.
     */
    componentAsBlankSpace(index: number): BlankSpaceComponentStateRef;
    /**
     * Gets the Detailed Timer component state at the specified index.
     */
    componentAsDetailedTimer(index: number): DetailedTimerComponentStateRef;
    /**
     * Gets the Graph component state at the specified index.
     */
    componentAsGraph(index: number): GraphComponentStateRef;
    /**
     * Gets the Key Value component state at the specified index.
     */
    componentAsKeyValue(index: number): KeyValueComponentStateRef;
    /**
     * Gets the Separator component state at the specified index.
     */
    componentAsSeparator(index: number): SeparatorComponentStateRef;
    /**
     * Gets the Splits component state at the specified index.
     */
    componentAsSplits(index: number): SplitsComponentStateRef;
    /**
     * Gets the Text component state at the specified index.
     */
    componentAsText(index: number): TextComponentStateRef;
    /**
     * Gets the Timer component state at the specified index.
     */
    componentAsTimer(index: number): TimerComponentStateRef;
    /**
     * Gets the Title component state at the specified index.
     */
    componentAsTitle(index: number): TitleComponentStateRef;
    /**
     * Gets the Group component state at the specified index.
     */
    componentAsGroup(index: number): GroupComponentStateRef;
    /**
     * Gets the Carousel component state at the specified index.
     */
    componentAsCarousel(index: number): CarouselComponentStateRef;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
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
export declare class LayoutStateRefMut extends LayoutStateRef {
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
export declare class LayoutState extends LayoutStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new empty Layout State. This is useful for creating an empty
     * layout state that gets updated over time.
     */
    static new(): LayoutState;
}
/**
 * A Linked Layout associates a Layout with a Run. If the Run has a Linked
 * Layout, it is supposed to be visualized with the Layout that is linked with
 * it.
 */
export declare class LinkedLayoutRef {
    ptr: number;
    /**
     * Checks whether the linked layout is the default layout.
     */
    isDefault(): boolean;
    /**
     * Returns the path of the linked layout, if it's not the default layout.
     */
    path(): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Linked Layout associates a Layout with a Run. If the Run has a Linked
 * Layout, it is supposed to be visualized with the Layout that is linked with
 * it.
 */
export declare class LinkedLayoutRefMut extends LinkedLayoutRef {
}
/**
 * A Linked Layout associates a Layout with a Run. If the Run has a Linked
 * Layout, it is supposed to be visualized with the Layout that is linked with
 * it.
 */
export declare class LinkedLayout extends LinkedLayoutRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Linked Layout with the path specified. If the path is empty,
     * the default layout is used instead.
     */
    static new(path: string): LinkedLayout;
}
/**
 * A run parsed by the Composite Parser. This contains the Run itself and
 * information about which parser parsed it.
 */
export declare class ParseRunResultRef {
    ptr: number;
    /**
     * Returns true if the Run got parsed successfully. false is returned otherwise.
     */
    parsedSuccessfully(): boolean;
    /**
     * Accesses the name of the Parser that parsed the Run. You may not call this
     * if the Run wasn't parsed successfully.
     */
    timerKind(): string;
    /**
     * Checks whether the Parser parsed a generic timer. Since a generic timer can
     * have any name, it may clash with the specific timer formats that
     * livesplit-core supports. With this function you can determine if a generic
     * timer format was parsed, instead of one of the more specific timer formats.
     */
    isGenericTimer(): boolean;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A run parsed by the Composite Parser. This contains the Run itself and
 * information about which parser parsed it.
 */
export declare class ParseRunResultRefMut extends ParseRunResultRef {
}
/**
 * A run parsed by the Composite Parser. This contains the Run itself and
 * information about which parser parsed it.
 */
export declare class ParseRunResult extends ParseRunResultRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Moves the actual Run object out of the Result. You may not call this if the
     * Run wasn't parsed successfully.
     */
    unwrap(): Run;
}
/**
 * The PB Chance Component is a component that shows how likely it is to beat
 * the Personal Best. If there is no active attempt it shows the general chance
 * of beating the Personal Best. During an attempt it actively changes based on
 * how well the attempt is going.
 */
export declare class PbChanceComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The PB Chance Component is a component that shows how likely it is to beat
 * the Personal Best. If there is no active attempt it shows the general chance
 * of beating the Personal Best. During an attempt it actively changes based on
 * how well the attempt is going.
 */
export declare class PbChanceComponentRefMut extends PbChanceComponentRef {
}
/**
 * The PB Chance Component is a component that shows how likely it is to beat
 * the Personal Best. If there is no active attempt it shows the general chance
 * of beating the Personal Best. During an attempt it actively changes based on
 * how well the attempt is going.
 */
export declare class PbChanceComponent extends PbChanceComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new PB Chance Component.
     */
    static new(): PbChanceComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The Possible Time Save Component is a component that shows how much time the
 * chosen comparison could've saved for the current segment, based on the Best
 * Segments. This component also allows showing the Total Possible Time Save
 * for the remainder of the current attempt.
 */
export declare class PossibleTimeSaveComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Possible Time Save Component is a component that shows how much time the
 * chosen comparison could've saved for the current segment, based on the Best
 * Segments. This component also allows showing the Total Possible Time Save
 * for the remainder of the current attempt.
 */
export declare class PossibleTimeSaveComponentRefMut extends PossibleTimeSaveComponentRef {
}
/**
 * The Possible Time Save Component is a component that shows how much time the
 * chosen comparison could've saved for the current segment, based on the Best
 * Segments. This component also allows showing the Total Possible Time Save
 * for the remainder of the current attempt.
 */
export declare class PossibleTimeSaveComponent extends PossibleTimeSaveComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Possible Time Save Component.
     */
    static new(): PossibleTimeSaveComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * Describes a potential clean up that could be applied. You can query a
 * message describing the details of this potential clean up. A potential clean
 * up can then be turned into an actual clean up in order to apply it to the
 * Run.
 */
export declare class PotentialCleanUpRef {
    ptr: number;
    /**
     * Accesses the message describing the potential clean up that can be applied
     * to a Run.
     */
    message(): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * Describes a potential clean up that could be applied. You can query a
 * message describing the details of this potential clean up. A potential clean
 * up can then be turned into an actual clean up in order to apply it to the
 * Run.
 */
export declare class PotentialCleanUpRefMut extends PotentialCleanUpRef {
}
/**
 * Describes a potential clean up that could be applied. You can query a
 * message describing the details of this potential clean up. A potential clean
 * up can then be turned into an actual clean up in order to apply it to the
 * Run.
 */
export declare class PotentialCleanUp extends PotentialCleanUpRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Previous Segment Component is a component that shows how much time was
 * saved or lost during the previous segment based on the chosen comparison.
 * Additionally, the potential time save for the previous segment can be
 * displayed. This component switches to a `Live Segment` view that shows
 * active time loss whenever the runner is losing time on the current segment.
 */
export declare class PreviousSegmentComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer and the layout
     * settings provided.
     */
    state(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): KeyValueComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Previous Segment Component is a component that shows how much time was
 * saved or lost during the previous segment based on the chosen comparison.
 * Additionally, the potential time save for the previous segment can be
 * displayed. This component switches to a `Live Segment` view that shows
 * active time loss whenever the runner is losing time on the current segment.
 */
export declare class PreviousSegmentComponentRefMut extends PreviousSegmentComponentRef {
}
/**
 * The Previous Segment Component is a component that shows how much time was
 * saved or lost during the previous segment based on the chosen comparison.
 * Additionally, the potential time save for the previous segment can be
 * displayed. This component switches to a `Live Segment` view that shows
 * active time loss whenever the runner is losing time on the current segment.
 */
export declare class PreviousSegmentComponent extends PreviousSegmentComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Previous Segment Component.
     */
    static new(): PreviousSegmentComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * A Run stores the split times for a specific game and category of a runner.
 */
export declare class RunRef {
    ptr: number;
    /**
     * Clones the Run object.
     */
    clone(): Run;
    /**
     * Accesses the name of the game this Run is for.
     */
    gameName(): string;
    /**
     * Accesses the game icon's data. If there is no game icon, this returns an
     * empty buffer.
     */
    gameIconPtr(): number;
    /**
     * Accesses the amount of bytes the game icon's data takes up.
     */
    gameIconLen(): number;
    /**
     * Accesses the name of the category this Run is for.
     */
    categoryName(): string;
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
    extendedFileName(useExtendedCategoryName: boolean): string;
    /**
     * Returns a name suitable for this Run that is built the following way:
     *
     * Game Name - Category Name
     *
     * If either is empty, the dash is omitted. If an extended category name is
     * used, the variables of the category are appended in a parenthesis.
     */
    extendedName(useExtendedCategoryName: boolean): string;
    /**
     * Returns an extended category name that possibly includes the region,
     * platform and variables, depending on the arguments provided. An extended
     * category name may look like this:
     *
     * Any% (No Tuner, JPN, Wii Emulator)
     */
    extendedCategoryName(showRegion: boolean, showPlatform: boolean, showVariables: boolean): string;
    /**
     * Returns the amount of runs that have been attempted with these splits.
     */
    attemptCount(): number;
    /**
     * Accesses additional metadata of this Run, like the platform and region
     * of the game.
     */
    metadata(): RunMetadataRef;
    /**
     * Accesses the time an attempt of this Run should start at.
     */
    offset(): TimeSpanRef;
    /**
     * Returns the amount of segments stored in this Run.
     */
    len(): number;
    /**
     * Returns whether the Run has been modified and should be saved so that the
     * changes don't get lost.
     */
    hasBeenModified(): boolean;
    /**
     * Accesses a certain segment of this Run. You may not provide an out of bounds
     * index.
     */
    segment(index: number): SegmentRef;
    /**
     * Returns the amount of native segment groups stored in this Run.
     */
    segmentGroupsLen(): number;
    /**
     * Accesses a native segment group stored in this Run by its index. You may not
     * provide an out of bounds index.
     */
    segmentGroup(index: number): SegmentGroupRef;
    /**
     * Returns the amount of segments in this Run.
     */
    segmentsLen(): number;
    /**
     * Returns the amount attempt history elements are stored in this Run.
     */
    attemptHistoryLen(): number;
    /**
     * Accesses the an attempt history element by its index. This does not store
     * the actual segment times, just the overall attempt information. Information
     * about the individual segments is stored within each segment. You may not
     * provide an out of bounds index.
     */
    attemptHistoryIndex(index: number): AttemptRef;
    /**
     * Saves a Run as a LiveSplit splits file (*.lss). If the run is actively in
     * use by a timer, use the appropriate method on the timer instead, in order to
     * properly save the current attempt as well.
     */
    saveAsLss(): string;
    /**
     * Returns the amount of custom comparisons stored in this Run.
     */
    customComparisonsLen(): number;
    /**
     * Accesses a custom comparison stored in this Run by its index. This includes
     * `Personal Best` but excludes all the other Comparison Generators. You may
     * not provide an out of bounds index.
     */
    customComparison(index: number): string;
    /**
     * Returns the amount of total comparisons stored in this Run.
     */
    comparisonsLen(): number;
    /**
     * Accesses a comparison stored in this Run by its index. This includes both
     * custom comparisons as well as all the Comparison Generators. You may not
     * provide an out of bounds index.
     */
    comparison(index: number): string;
    /**
     * Accesses the Auto Splitter Settings that are encoded as XML.
     */
    autoSplitterSettings(): string;
    /**
     * Accesses the linked layout of this Run. If a Layout is linked, it is
     * supposed to be loaded to visualize the Run.
     */
    linkedLayout(): LinkedLayout | null;
    saveAsLssBytes(): Uint8Array<ArrayBuffer>;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Run stores the split times for a specific game and category of a runner.
 */
export declare class RunRefMut extends RunRef {
    /**
     * Pushes the segment provided to the end of the list of segments of this Run.
     */
    pushSegment(segment: Segment): void;
    /**
     * Sets the name of the game this Run is for.
     */
    setGameName(game: string): void;
    /**
     * Sets the name of the category this Run is for.
     */
    setCategoryName(category: string): void;
    /**
     * Marks the Run as modified, so that it is known that there are changes
     * that should be saved.
     */
    markAsModified(): void;
}
/**
 * A Run stores the split times for a specific game and category of a runner.
 */
export declare class Run extends RunRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Run object with no segments.
     */
    static new(): Run;
    /**
     * Attempts to parse a splits file from an array by invoking the corresponding
     * parser for the file format detected. Additionally you can provide the path
     * of the splits file so additional files, like external images, can be loaded.
     * If you are using livesplit-core in a server-like environment, set this to
     * null. Only client-side applications should provide a path here. Unlike the
     * normal parsing function, it also fixes problems in the Run, such as
     * decreasing times and missing information.
     */
    static parse(data: number, length: number, loadFilesPath: string): ParseRunResult;
    static parseArray(data: Uint8Array, loadFilesPath: string): ParseRunResult;
    static parseString(text: string, loadFilesPath: string): ParseRunResult;
}
/**
 * The Run Editor allows modifying Runs while ensuring that all the different
 * invariants of the Run objects are upheld no matter what kind of operations
 * are being applied to the Run. It provides the current state of the editor as
 * state objects that can be visualized by any kind of User Interface.
 */
export declare class RunEditorRef {
    ptr: number;
    /**
     * Calculates the Run Editor's state and encodes it as
     * JSON in order to visualize it.
     */
    stateAsJson(imageCache: ImageCacheRefMut, lang: number): any;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Run Editor allows modifying Runs while ensuring that all the different
 * invariants of the Run objects are upheld no matter what kind of operations
 * are being applied to the Run. It provides the current state of the editor as
 * state objects that can be visualized by any kind of User Interface.
 */
export declare class RunEditorRefMut extends RunEditorRef {
    /**
     * Selects a different timing method for being modified.
     */
    selectTimingMethod(method: number): void;
    /**
     * Unselects the segment with the given index. If it's not selected or the
     * index is out of bounds, nothing happens. The segment is not unselected,
     * when it is the only segment that is selected. If the active segment is
     * unselected, the most recently selected segment remaining becomes the
     * active segment.
     */
    unselect(index: number): void;
    /**
     * In addition to the segments that are already selected, the segment with
     * the given index is being selected. The segment chosen also becomes the
     * active segment.
     *
     * This panics if the index of the segment provided is out of bounds.
     */
    selectAdditionally(index: number): void;
    /**
     * Selects all segments from the currently active segment to the segment with
     * the given index. The segment with the given index becomes the new active
     * segment.
     *
     * This panics if the index of the segment provided is out of bounds.
     */
    selectRange(index: number): void;
    /**
     * Selects the segment with the given index. All other segments are
     * unselected. The segment chosen also becomes the active segment.
     *
     * This panics if the index of the segment provided is out of bounds.
     */
    selectOnly(index: number): void;
    /**
     * Sets the name of the game.
     */
    setGameName(game: string): void;
    /**
     * Sets the name of the category.
     */
    setCategoryName(category: string): void;
    /**
     * Parses and sets the timer offset from the string provided. The timer
     * offset specifies the time, the timer starts at when starting a new
     * attempt.
     */
    parseAndSetOffset(offset: string, lang: number): boolean;
    /**
     * Parses and sets the attempt count from the string provided. Changing
     * this has no affect on the attempt history or the segment history. This
     * number is mostly just a visual number for the runner.
     */
    parseAndSetAttemptCount(attempts: string): boolean;
    /**
     * Sets the game's icon.
     */
    setGameIcon(data: number, length: number): void;
    /**
     * Removes the game's icon.
     */
    removeGameIcon(): void;
    /**
     * Sets the Linked Layout of the Run. If a Layout is linked, it is supposed to
     * be loaded to visualize the Run.
     */
    setLinkedLayout(linkedLayout: LinkedLayout): void;
    /**
     * Removes the Linked Layout of the Run if there is one. If a Layout is linked,
     * it is supposed to be loaded to visualize the Run.
     */
    removeLinkedLayout(): void;
    /**
     * Sets the speedrun.com Run ID of the run. You need to ensure that the
     * record on speedrun.com matches up with the Personal Best of this run.
     * This may be empty if there's no association.
     */
    setRunId(name: string): void;
    /**
     * Sets the name of the region this game is from. This may be empty if it's
     * not specified.
     */
    setRegionName(name: string): void;
    /**
     * Sets the name of the platform this game is run on. This may be empty if
     * it's not specified.
     */
    setPlatformName(name: string): void;
    /**
     * Specifies whether this speedrun is done on an emulator. Keep in mind
     * that false may also mean that this information is simply not known.
     */
    setEmulatorUsage(usesEmulator: boolean): void;
    /**
     * Sets the speedrun.com variable with the name specified to the value specified. A
     * variable is an arbitrary key value pair storing additional information
     * about the category. An example of this may be whether Amiibos are used
     * in this category. If the variable doesn't exist yet, it is being
     * inserted.
     */
    setSpeedrunComVariable(name: string, value: string): void;
    /**
     * Removes the speedrun.com variable with the name specified.
     */
    removeSpeedrunComVariable(name: string): void;
    /**
     * Adds a new permanent custom variable. If there's a temporary variable with
     * the same name, it gets turned into a permanent variable and its value stays.
     * If a permanent variable with the name already exists, nothing happens.
     */
    addCustomVariable(name: string): void;
    /**
     * Sets the value of a custom variable with the name specified. If the custom
     * variable does not exist, or is not a permanent variable, nothing happens.
     */
    setCustomVariable(name: string, value: string): void;
    /**
     * Removes the custom variable with the name specified. If the custom variable
     * does not exist, or is not a permanent variable, nothing happens.
     */
    removeCustomVariable(name: string): void;
    /**
     * Resets all the Metadata Information.
     */
    clearMetadata(): void;
    /**
     * Inserts a new empty segment above all selected segments and adjusts the
     * Run's history information accordingly. The newly created segment is then
     * the only selected segment and also the active segment.
     */
    insertSegmentAbove(): void;
    /**
     * Inserts a new empty segment below all selected segments and adjusts the
     * Run's history information accordingly. The newly created segment is then
     * the only selected segment and also the active segment.
     */
    insertSegmentBelow(): void;
    /**
     * Removes all the selected segments, unless all of them are selected. The
     * run's information is automatically adjusted properly. The next
     * not-to-be-removed segment after the active segment becomes the new
     * active segment. If there's none, then the next not-to-be-removed segment
     * before the active segment, becomes the new active segment.
     */
    removeSegments(): void;
    /**
     * Moves all the selected segments up, unless the first segment is
     * selected. The run's information is automatically adjusted properly. The
     * active segment stays the active segment.
     */
    moveSegmentsUp(): void;
    /**
     * Moves all the selected segments down, unless the last segment is
     * selected. The run's information is automatically adjusted properly. The
     * active segment stays the active segment.
     */
    moveSegmentsDown(): void;
    /**
     * Creates a native segment group from the currently selected contiguous
     * segment rows. Returns false if the selection is not contiguous or overlaps
     * an existing group.
     */
    createSegmentGroupFromSelection(name: string): boolean;
    /**
     * Selects every segment in the native segment group with the provided index
     * and unselects all other segments. Returns false if the group doesn't
     * exist.
     */
    selectSegmentGroup(groupIndex: number): boolean;
    /**
     * Toggles the native segment group with the provided index as part of the
     * current selection without clearing other selected rows. Returns false if
     * the group doesn't exist.
     */
    toggleSegmentGroupSelection(groupIndex: number): boolean;
    /**
     * Extends the current selection through the entire native segment group with
     * the provided index. Returns false if the group doesn't exist.
     */
    selectSegmentGroupRange(groupIndex: number): boolean;
    /**
     * Removes the selected native segment groups, while keeping all segments.
     */
    removeSelectedSegmentGroups(): boolean;
    /**
     * Renames the native segment group with the provided index.
     */
    renameSegmentGroup(groupIndex: number, name: string): boolean;
    /**
     * Sets the icon of the native segment group with the provided index.
     */
    setSegmentGroupIcon(groupIndex: number, data: number, length: number): boolean;
    /**
     * Removes the explicit icon of the native segment group with the provided
     * index.
     */
    removeSegmentGroupIcon(groupIndex: number): boolean;
    /**
     * Sets the icon of the active segment.
     */
    activeSetIcon(data: number, length: number): void;
    /**
     * Removes the icon of the active segment.
     */
    activeRemoveIcon(): void;
    /**
     * Sets the name of the active segment.
     */
    activeSetName(name: string): void;
    /**
     * Parses a split time from a string and sets it for the active segment with
     * the chosen timing method.
     */
    activeParseAndSetSplitTime(time: string, lang: number): boolean;
    /**
     * Parses a segment time from a string and sets it for the active segment with
     * the chosen timing method.
     */
    activeParseAndSetSegmentTime(time: string, lang: number): boolean;
    /**
     * Parses a best segment time from a string and sets it for the active segment
     * with the chosen timing method.
     */
    activeParseAndSetBestSegmentTime(time: string, lang: number): boolean;
    /**
     * Parses a comparison time for the provided comparison and sets it for the
     * active active segment with the chosen timing method.
     */
    activeParseAndSetComparisonTime(comparison: string, time: string, lang: number): boolean;
    /**
     * Adds a new custom comparison. It can't be added if it starts with
     * `[Race]` or it already exists.
     */
    addComparison(comparison: string): boolean;
    /**
     * Imports the Personal Best from the provided run as a comparison. The
     * comparison can't be added if its name starts with `[Race]` or it already
     * exists.
     */
    importComparison(run: RunRef, comparison: string): boolean;
    /**
     * Removes the chosen custom comparison. You can't remove a Comparison
     * Generator's Comparison or the Personal Best.
     */
    removeComparison(comparison: string): void;
    /**
     * Renames a comparison. The comparison can't be renamed if the new name of
     * the comparison starts with `[Race]` or it already exists.
     */
    renameComparison(oldName: string, newName: string): boolean;
    /**
     * Reorders the custom comparisons by moving the comparison with the source
     * index specified to the destination index specified. Returns false if one
     * of the indices is invalid. The indices are based on the comparison names of
     * the Run Editor's state.
     */
    moveComparison(srcIndex: number, dstIndex: number): boolean;
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
    parseAndGenerateGoalComparison(time: string, lang: number): boolean;
    /**
     * Copies a comparison with the given name as a new custom comparison with the
     * new name provided. It can't be added if it starts with `[Race]` or it
     * already exists. The old comparison needs to exist.
     */
    copyComparison(oldName: string, newName: string): boolean;
    /**
     * Clears out the Attempt History and the Segment Histories of all the
     * segments.
     */
    clearHistory(): void;
    /**
     * Clears out the Attempt History, the Segment Histories, all the times,
     * sets the Attempt Count to 0 and clears the speedrun.com run id
     * association. All Custom Comparisons other than `Personal Best` are
     * deleted as well.
     */
    clearTimes(): void;
    /**
     * Creates a Sum of Best Cleaner which allows you to interactively remove
     * potential issues in the segment history that lead to an inaccurate Sum
     * of Best. If you skip a split, whenever you will do the next split, the
     * combined segment time might be faster than the sum of the individual
     * best segments. The Sum of Best Cleaner will point out all of these and
     * allows you to delete them individually if any of them seem wrong.
     */
    cleanSumOfBest(lang: number): SumOfBestCleaner;
    setGameIconFromArray(data: Uint8Array): void;
    activeSetIconFromArray(data: Uint8Array): void;
    setSegmentGroupIconFromArray(groupIndex: number, data: Uint8Array): boolean;
}
/**
 * The Run Editor allows modifying Runs while ensuring that all the different
 * invariants of the Run objects are upheld no matter what kind of operations
 * are being applied to the Run. It provides the current state of the editor as
 * state objects that can be visualized by any kind of User Interface.
 */
export declare class RunEditor extends RunEditorRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Run Editor that modifies the Run provided. Creation of the Run
     * Editor fails when a Run with no segments is provided. If a Run object with
     * no segments is provided, the Run Editor creation fails and null is
     * returned.
     */
    static new(run: Run): RunEditor | null;
    /**
     * Closes the Run Editor and gives back access to the modified Run object. In
     * case you want to implement a Cancel Button, just dispose the Run object you
     * get here.
     */
    close(): Run;
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export declare class RunMetadataRef {
    ptr: number;
    /**
     * Accesses the speedrun.com Run ID of the run. This Run ID specify which
     * Record on speedrun.com this run is associated with. This should be
     * changed once the Personal Best doesn't match up with that record
     * anymore. This may be empty if there's no association.
     */
    runId(): string;
    /**
     * Accesses the name of the platform this game is run on. This may be empty
     * if it's not specified.
     */
    platformName(): string;
    /**
     * Returns true if this speedrun is done on an emulator. However false
     * may also indicate that this information is simply not known.
     */
    usesEmulator(): boolean;
    /**
     * Accesses the name of the region this game is from. This may be empty if
     * it's not specified.
     */
    regionName(): string;
    /**
     * Returns an iterator iterating over all the speedrun.com variables and their
     * values that have been specified.
     */
    speedrunComVariables(): RunMetadataSpeedrunComVariablesIter;
    /**
     * Returns an iterator iterating over all the custom variables and their
     * values. This includes both temporary and permanent variables.
     */
    customVariables(): RunMetadataCustomVariablesIter;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export declare class RunMetadataRefMut extends RunMetadataRef {
}
/**
 * The Run Metadata stores additional information about a run, like the
 * platform and region of the game. All of this information is optional.
 */
export declare class RunMetadata extends RunMetadataRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export declare class RunMetadataCustomVariableRef {
    ptr: number;
    /**
     * Accesses the name of this custom variable.
     */
    name(): string;
    /**
     * Accesses the value of this custom variable.
     */
    value(): string;
    /**
     * Returns true if the custom variable is permanent. Permanent variables get
     * stored in the splits file and are visible in the run editor. Temporary
     * variables are not.
     */
    isPermanent(): boolean;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export declare class RunMetadataCustomVariableRefMut extends RunMetadataCustomVariableRef {
}
/**
 * A custom variable is a key value pair storing additional information about a
 * run. Unlike the speedrun.com variables, these can be fully custom and don't
 * need to correspond to anything on speedrun.com. Permanent custom variables
 * can be specified by the runner. Additionally auto splitters or other sources
 * may provide temporary custom variables that are not stored in the splits
 * files.
 */
export declare class RunMetadataCustomVariable extends RunMetadataCustomVariableRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * An iterator iterating over all the custom variables and their values
 * that have been specified.
 */
export declare class RunMetadataCustomVariablesIterRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * An iterator iterating over all the custom variables and their values
 * that have been specified.
 */
export declare class RunMetadataCustomVariablesIterRefMut extends RunMetadataCustomVariablesIterRef {
    /**
     * Accesses the next custom variable. Returns null if there are no more
     * variables.
     */
    next(): RunMetadataCustomVariableRef | null;
}
/**
 * An iterator iterating over all the custom variables and their values
 * that have been specified.
 */
export declare class RunMetadataCustomVariablesIter extends RunMetadataCustomVariablesIterRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A speedrun.com variable is an arbitrary key value pair storing additional
 * information about the category. An example of this may be whether Amiibos
 * are used in the category.
 */
export declare class RunMetadataSpeedrunComVariableRef {
    ptr: number;
    /**
     * Accesses the name of this speedrun.com variable.
     */
    name(): string;
    /**
     * Accesses the value of this speedrun.com variable.
     */
    value(): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A speedrun.com variable is an arbitrary key value pair storing additional
 * information about the category. An example of this may be whether Amiibos
 * are used in the category.
 */
export declare class RunMetadataSpeedrunComVariableRefMut extends RunMetadataSpeedrunComVariableRef {
}
/**
 * A speedrun.com variable is an arbitrary key value pair storing additional
 * information about the category. An example of this may be whether Amiibos
 * are used in the category.
 */
export declare class RunMetadataSpeedrunComVariable extends RunMetadataSpeedrunComVariableRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * An iterator iterating over all the speedrun.com variables and their values
 * that have been specified.
 */
export declare class RunMetadataSpeedrunComVariablesIterRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * An iterator iterating over all the speedrun.com variables and their values
 * that have been specified.
 */
export declare class RunMetadataSpeedrunComVariablesIterRefMut extends RunMetadataSpeedrunComVariablesIterRef {
    /**
     * Accesses the next speedrun.com variable. Returns null if there are no more
     * variables.
     */
    next(): RunMetadataSpeedrunComVariableRef | null;
}
/**
 * An iterator iterating over all the speedrun.com variables and their values
 * that have been specified.
 */
export declare class RunMetadataSpeedrunComVariablesIter extends RunMetadataSpeedrunComVariablesIterRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A Segment describes a point in a speedrun that is suitable for storing a
 * split time. This stores the name of that segment, an icon, the split times
 * of different comparisons, and a history of segment times.
 */
export declare class SegmentRef {
    ptr: number;
    /**
     * Accesses the name of the segment.
     */
    name(): string;
    /**
     * Accesses the segment icon's data. If there is no segment icon, this returns
     * an empty buffer.
     */
    iconPtr(): number;
    /**
     * Accesses the amount of bytes the segment icon's data takes up.
     */
    iconLen(): number;
    /**
     * Accesses the specified comparison's time. If there's none for this
     * comparison, an empty time is being returned (but not stored in the
     * segment).
     */
    comparison(comparison: string): TimeRef;
    /**
     * Accesses the split time of the Personal Best for this segment. If it
     * doesn't exist, an empty time is returned.
     */
    personalBestSplitTime(): TimeRef;
    /**
     * Accesses the Best Segment Time.
     */
    bestSegmentTime(): TimeRef;
    /**
     * Accesses the Segment History of this segment.
     */
    segmentHistory(): SegmentHistoryRef;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Segment describes a point in a speedrun that is suitable for storing a
 * split time. This stores the name of that segment, an icon, the split times
 * of different comparisons, and a history of segment times.
 */
export declare class SegmentRefMut extends SegmentRef {
}
/**
 * A Segment describes a point in a speedrun that is suitable for storing a
 * split time. This stores the name of that segment, an icon, the split times
 * of different comparisons, and a history of segment times.
 */
export declare class Segment extends SegmentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Segment with the name given.
     */
    static new(name: string): Segment;
}
/**
 * A Segment Group describes a contiguous range of segments that forms a
 * one-level group.
 */
export declare class SegmentGroupRef {
    ptr: number;
    /**
     * Accesses the inclusive start index of the segment group.
     */
    start(): number;
    /**
     * Accesses the exclusive end index of the segment group.
     */
    end(): number;
    /**
     * Accesses the explicit name of the segment group. If the group uses the
     * final segment's name instead, an empty string is returned.
     */
    name(): string;
    /**
     * Accesses the explicit icon's data. If the group uses the final segment's
     * icon instead, an empty buffer is returned.
     */
    iconPtr(): number;
    /**
     * Accesses the amount of bytes the explicit icon's data takes up.
     */
    iconLen(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Segment Group describes a contiguous range of segments that forms a
 * one-level group.
 */
export declare class SegmentGroupRefMut extends SegmentGroupRef {
}
/**
 * A Segment Group describes a contiguous range of segments that forms a
 * one-level group.
 */
export declare class SegmentGroup extends SegmentGroupRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * Stores the segment times achieved for a certain segment. Each segment is
 * tagged with an index. Only segment times with an index larger than 0 are
 * considered times actually achieved by the runner, while the others are
 * artifacts of route changes and similar algorithmic changes.
 */
export declare class SegmentHistoryRef {
    ptr: number;
    /**
     * Iterates over all the segment times and their indices.
     */
    iter(): SegmentHistoryIter;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * Stores the segment times achieved for a certain segment. Each segment is
 * tagged with an index. Only segment times with an index larger than 0 are
 * considered times actually achieved by the runner, while the others are
 * artifacts of route changes and similar algorithmic changes.
 */
export declare class SegmentHistoryRefMut extends SegmentHistoryRef {
}
/**
 * Stores the segment times achieved for a certain segment. Each segment is
 * tagged with an index. Only segment times with an index larger than 0 are
 * considered times actually achieved by the runner, while the others are
 * artifacts of route changes and similar algorithmic changes.
 */
export declare class SegmentHistory extends SegmentHistoryRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A segment time achieved for a segment. It is tagged with an index. Only
 * segment times with an index larger than 0 are considered times actually
 * achieved by the runner, while the others are artifacts of route changes and
 * similar algorithmic changes.
 */
export declare class SegmentHistoryElementRef {
    ptr: number;
    /**
     * Accesses the index of the segment history element.
     */
    index(): number;
    /**
     * Accesses the segment time of the segment history element.
     */
    time(): TimeRef;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A segment time achieved for a segment. It is tagged with an index. Only
 * segment times with an index larger than 0 are considered times actually
 * achieved by the runner, while the others are artifacts of route changes and
 * similar algorithmic changes.
 */
export declare class SegmentHistoryElementRefMut extends SegmentHistoryElementRef {
}
/**
 * A segment time achieved for a segment. It is tagged with an index. Only
 * segment times with an index larger than 0 are considered times actually
 * achieved by the runner, while the others are artifacts of route changes and
 * similar algorithmic changes.
 */
export declare class SegmentHistoryElement extends SegmentHistoryElementRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * Iterates over all the segment times of a segment and their indices.
 */
export declare class SegmentHistoryIterRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * Iterates over all the segment times of a segment and their indices.
 */
export declare class SegmentHistoryIterRefMut extends SegmentHistoryIterRef {
    /**
     * Accesses the next Segment History element. Returns null if there are no
     * more elements.
     */
    next(): SegmentHistoryElementRef | null;
}
/**
 * Iterates over all the segment times of a segment and their indices.
 */
export declare class SegmentHistoryIter extends SegmentHistoryIterRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Segment Time Component is a component that shows the time for the current
 * segment in a comparison of your choosing. If no comparison is specified it
 * uses the timer's current comparison.
 */
export declare class SegmentTimeComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Segment Time Component is a component that shows the time for the current
 * segment in a comparison of your choosing. If no comparison is specified it
 * uses the timer's current comparison.
 */
export declare class SegmentTimeComponentRefMut extends SegmentTimeComponentRef {
}
/**
 * The Segment Time Component is a component that shows the time for the current
 * segment in a comparison of your choosing. If no comparison is specified it
 * uses the timer's current comparison.
 */
export declare class SegmentTimeComponent extends SegmentTimeComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Segment Time Component.
     */
    static new(): SegmentTimeComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The Separator Component is a simple component that only serves to render
 * separators between components.
 */
export declare class SeparatorComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Separator Component is a simple component that only serves to render
 * separators between components.
 */
export declare class SeparatorComponentRefMut extends SeparatorComponentRef {
    /**
     * Calculates the component's state.
     */
    state(): SeparatorComponentState;
}
/**
 * The Separator Component is a simple component that only serves to render
 * separators between components.
 */
export declare class SeparatorComponent extends SeparatorComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Separator Component.
     */
    static new(): SeparatorComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class SeparatorComponentStateRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class SeparatorComponentStateRefMut extends SeparatorComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class SeparatorComponentState extends SeparatorComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Splits Component is the main component for visualizing all the split
 * times. Each segment is shown in a tabular fashion showing the segment icon,
 * segment name, the delta compared to the chosen comparison, and the split
 * time. The list provides scrolling functionality, so not every segment needs
 * to be shown all the time.
 */
export declare class SplitsComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Splits Component is the main component for visualizing all the split
 * times. Each segment is shown in a tabular fashion showing the segment icon,
 * segment name, the delta compared to the chosen comparison, and the split
 * time. The list provides scrolling functionality, so not every segment needs
 * to be shown all the time.
 */
export declare class SplitsComponentRefMut extends SplitsComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(imageCache: ImageCacheRefMut, timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer and layout settings
     * provided.
     */
    state(imageCache: ImageCacheRefMut, timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): SplitsComponentState;
    /**
     * Scrolls up the window of the segments that are shown. Doesn't move the
     * scroll window if it reaches the top of the segments.
     */
    scrollUp(): void;
    /**
     * Scrolls down the window of the segments that are shown. Doesn't move the
     * scroll window if it reaches the bottom of the segments.
     */
    scrollDown(): void;
    /**
     * The amount of segments to show in the list at any given time. If this is
     * set to 0, all the segments are shown. If this is set to a number lower
     * than the total amount of segments, only a certain window of all the
     * segments is shown. This window can scroll up or down.
     */
    setVisualSplitCount(count: number): void;
    /**
     * If there's more segments than segments that are shown, the window
     * showing the segments automatically scrolls up and down when the current
     * segment changes. This count determines the minimum number of future
     * segments to be shown in this scrolling window when it automatically
     * scrolls.
     */
    setSplitPreviewCount(count: number): void;
    /**
     * If not every segment is shown in the scrolling window of segments, then
     * this determines whether the final segment is always to be shown, as it
     * contains valuable information about the total duration of the chosen
     * comparison, which is often the runner's Personal Best.
     */
    setAlwaysShowLastSplit(alwaysShowLastSplit: boolean): void;
    /**
     * Whether to show a pronounced separator before a row when one or more rows
     * immediately before it are omitted from the scrolling window.
     */
    setShowGapSeparators(showGapSeparators: boolean): void;
}
/**
 * The Splits Component is the main component for visualizing all the split
 * times. Each segment is shown in a tabular fashion showing the segment icon,
 * segment name, the delta compared to the chosen comparison, and the split
 * time. The list provides scrolling functionality, so not every segment needs
 * to be shown all the time.
 */
export declare class SplitsComponent extends SplitsComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Splits Component.
     */
    static new(lang: number): SplitsComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object that describes a single segment's information to visualize.
 */
export declare class SplitsComponentStateRef {
    ptr: number;
    /**
     * Returns the amount of segments to visualize.
     */
    len(): number;
    /**
     * The icon of the segment. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon(index: number): string;
    /**
     * The name of the segment with the specified index. You may not provide an out
     * of bounds index.
     */
    name(index: number): string;
    /**
     * The amount of columns to visualize for the segment with the specified index.
     * The columns are specified from right to left. You may not provide an out of
     * bounds index. The amount of columns to visualize may differ from segment to
     * segment.
     */
    columnsLen(index: number): number;
    /**
     * The column's value to show for the split and column with the specified
     * index. The columns are specified from right to left. You may not provide an
     * out of bounds index.
     */
    columnValue(index: number, columnIndex: number): string;
    /**
     * The semantic coloring information the column's value carries of the segment
     * and column with the specified index. The columns are specified from right to
     * left. You may not provide an out of bounds index.
     */
    columnSemanticColor(index: number, columnIndex: number): string;
    /**
     * Describes if the segment with the specified index is the segment the active
     * attempt is currently on.
     */
    isCurrentSplit(index: number): boolean;
    /**
     * Describes if the segment with the specified index is the segment selected
     * by manually scrolling through subsplit groups.
     */
    isScrolledToSplit(index: number): boolean;
    /**
     * Specifies whether the row with the specified index should be indented. You
     * may not provide an out of bounds index.
     */
    isIndented(index: number): boolean;
    /**
     * Specifies whether a more pronounced separator should be shown before the
     * row with the specified index because one or more logical rows preceding it
     * are not visible. You may not provide an out of bounds index.
     */
    separatorBefore(index: number): boolean;
    /**
     * Returns the visual section that the row with the specified index belongs
     * to. Renderers can use this to alternate backgrounds when multiple flat
     * segments collapse into a single section. You may not provide an out of
     * bounds index.
     */
    sectionIndex(index: number): number;
    /**
     * Describes if the columns have labels that are meant to be shown. If this is
     * `false`, no labels are supposed to be visualized.
     */
    hasColumnLabels(): boolean;
    /**
     * Returns the label of the column specified. The list is specified from right
     * to left. You may not provide an out of bounds index.
     */
    columnLabel(index: number): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object that describes a single segment's information to visualize.
 */
export declare class SplitsComponentStateRefMut extends SplitsComponentStateRef {
}
/**
 * The state object that describes a single segment's information to visualize.
 */
export declare class SplitsComponentState extends SplitsComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A Sum of Best Cleaner allows you to interactively remove potential issues in
 * the Segment History that lead to an inaccurate Sum of Best. If you skip a
 * split, whenever you get to the next split, the combined segment time might
 * be faster than the sum of the individual best segments. The Sum of Best
 * Cleaner will point out all of occurrences of this and allows you to delete
 * them individually if any of them seem wrong.
 */
export declare class SumOfBestCleanerRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Sum of Best Cleaner allows you to interactively remove potential issues in
 * the Segment History that lead to an inaccurate Sum of Best. If you skip a
 * split, whenever you get to the next split, the combined segment time might
 * be faster than the sum of the individual best segments. The Sum of Best
 * Cleaner will point out all of occurrences of this and allows you to delete
 * them individually if any of them seem wrong.
 */
export declare class SumOfBestCleanerRefMut extends SumOfBestCleanerRef {
    /**
     * Returns the next potential clean up. If there are no more potential
     * clean ups, null is returned.
     */
    nextPotentialCleanUp(): PotentialCleanUp | null;
    /**
     * Applies a clean up to the Run.
     */
    apply(cleanUp: PotentialCleanUp): void;
}
/**
 * A Sum of Best Cleaner allows you to interactively remove potential issues in
 * the Segment History that lead to an inaccurate Sum of Best. If you skip a
 * split, whenever you get to the next split, the combined segment time might
 * be faster than the sum of the individual best segments. The Sum of Best
 * Cleaner will point out all of occurrences of this and allows you to delete
 * them individually if any of them seem wrong.
 */
export declare class SumOfBestCleaner extends SumOfBestCleanerRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
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
export declare class SumOfBestComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
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
export declare class SumOfBestComponentRefMut extends SumOfBestComponentRef {
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
export declare class SumOfBestComponent extends SumOfBestComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Sum of Best Segments Component.
     */
    static new(): SumOfBestComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The Text Component simply visualizes any given text. This can either be a
 * single centered text, or split up into a left and right text, which is
 * suitable for a situation where you have a label and a value.
 */
export declare class TextComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef): any;
    /**
     * Calculates the component's state.
     */
    state(timer: TimerRef): TextComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Text Component simply visualizes any given text. This can either be a
 * single centered text, or split up into a left and right text, which is
 * suitable for a situation where you have a label and a value.
 */
export declare class TextComponentRefMut extends TextComponentRef {
    /**
     * Switches the component to display the specified custom variable instead of a
     * fixed text. The boolean indicates whether the name should also be shown as a
     * key value pair.
     */
    useVariable(variable: string, split: boolean): void;
    /**
     * Sets the centered text. If the current mode is split, it is switched to
     * centered mode.
     */
    setCenter(text: string): void;
    /**
     * Sets the left text. If the current mode is centered, it is switched to
     * split mode, with the right text being empty.
     */
    setLeft(text: string): void;
    /**
     * Sets the right text. If the current mode is centered, it is switched to
     * split mode, with the left text being empty.
     */
    setRight(text: string): void;
}
/**
 * The Text Component simply visualizes any given text. This can either be a
 * single centered text, or split up into a left and right text, which is
 * suitable for a situation where you have a label and a value.
 */
export declare class TextComponent extends TextComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Text Component.
     */
    static new(): TextComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TextComponentStateRef {
    ptr: number;
    /**
     * Accesses the left part of the text. If the text isn't split up, an empty
     * string is returned instead.
     */
    left(): string;
    /**
     * Accesses the right part of the text. If the text isn't split up, an empty
     * string is returned instead.
     */
    right(): string;
    /**
     * Accesses the centered text. If the text isn't centered, an empty string is
     * returned instead.
     */
    center(): string;
    /**
     * Returns whether the text is split up into a left and right part.
     */
    isSplit(): boolean;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TextComponentStateRefMut extends TextComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TextComponentState extends TextComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A time that can store a Real Time and a Game Time. Both of them are
 * optional.
 */
export declare class TimeRef {
    ptr: number;
    /**
     * Clones the time.
     */
    clone(): Time;
    /**
     * The Real Time value. This may be null if this time has no Real Time value.
     */
    realTime(): TimeSpanRef | null;
    /**
     * The Game Time value. This may be null if this time has no Game Time value.
     */
    gameTime(): TimeSpanRef | null;
    /**
     * Access the time's value for the timing method specified.
     */
    index(timingMethod: number): TimeSpanRef | null;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A time that can store a Real Time and a Game Time. Both of them are
 * optional.
 */
export declare class TimeRefMut extends TimeRef {
}
/**
 * A time that can store a Real Time and a Game Time. Both of them are
 * optional.
 */
export declare class Time extends TimeRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * A Time Span represents a certain span of time.
 */
export declare class TimeSpanRef {
    ptr: number;
    /**
     * Clones the Time Span.
     */
    clone(): TimeSpan;
    /**
     * Returns the total amount of seconds (including decimals) this Time Span
     * represents.
     */
    totalSeconds(): number;
    /**
     * Returns the total amount of whole seconds (excluding decimals) this Time
     * Span represents.
     */
    wholeSeconds(): BigInt;
    /**
     * Returns the number of nanoseconds past the last full second that makes up
     * the Time Span.
     */
    subsecNanoseconds(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Time Span represents a certain span of time.
 */
export declare class TimeSpanRefMut extends TimeSpanRef {
    /**
     * Changes a Time Span by adding a Time Span onto it.
     */
    addAssign(other: TimeSpanRef): void;
}
/**
 * A Time Span represents a certain span of time.
 */
export declare class TimeSpan extends TimeSpanRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Time Span from a given amount of seconds.
     */
    static fromSeconds(seconds: number): TimeSpan;
    /**
     * Parses a Time Span from a string. Returns null if the time can't be
     * parsed.
     */
    static parse(text: string, lang: number): TimeSpan | null;
}
/**
 * A Timer provides all the capabilities necessary for doing speedrun attempts.
 */
export declare class TimerRef {
    ptr: number;
    /**
     * Accesses the index of the split the attempt is currently on. If there's
     * no attempt in progress, `-1` is returned instead. This returns an
     * index that is equal to the amount of segments when the attempt is
     * finished, but has not been reset. So you need to be careful when using
     * this value for indexing.
     */
    currentSplitIndex(): number;
    /**
     * Checks whether the current attempt has new best segment times in any of the
     * segments (for both TimingMethods) or a new Personal Best (for the current
     * TimingMethod). This can be used to ask the user whether to update the splits
     * when resetting.
     */
    currentAttemptHasNewBestTimes(): boolean;
    /**
     * Returns the currently selected Timing Method.
     */
    currentTimingMethod(): number;
    /**
     * Returns the current comparison that is being compared against. This may
     * be a custom comparison or one of the Comparison Generators.
     */
    currentComparison(): string;
    /**
     * Returns whether Game Time is currently initialized. Game Time
     * automatically gets uninitialized for each new attempt.
     */
    isGameTimeInitialized(): boolean;
    /**
     * Returns whether the Game Timer is currently paused. If the Game Timer is
     * not paused, it automatically increments similar to Real Time.
     */
    isGameTimePaused(): boolean;
    /**
     * Accesses the loading times. Loading times are defined as Game Time - Real Time.
     */
    loadingTimes(): TimeSpanRef;
    /**
     * Returns the current Timer Phase.
     */
    currentPhase(): number;
    /**
     * Accesses the Run in use by the Timer.
     */
    getRun(): RunRef;
    /**
     * Saves the Run in use by the Timer as a LiveSplit splits file (*.lss).
     */
    saveAsLss(): string;
    /**
     * Prints out debug information representing the whole state of the Timer. This
     * is being written to stdout.
     */
    printDebug(): void;
    /**
     * Returns the current time of the Timer. The Game Time is null if the Game
     * Time has not been initialized.
     */
    currentTime(): TimeRef;
    saveAsLssBytes(): Uint8Array<ArrayBuffer>;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * A Timer provides all the capabilities necessary for doing speedrun attempts.
 */
export declare class TimerRefMut extends TimerRef {
    /**
     * Replaces the Run object used by the Timer with the Run object provided. If
     * the Run provided contains no segments, it can't be used for timing and is
     * not being modified. Otherwise the Run that was in use by the Timer gets
     * stored in the Run object provided. Before the Run is returned, the current
     * attempt is reset and the splits are being updated depending on the
     * `update_splits` parameter. The return value indicates whether the Run got
     * replaced successfully.
     */
    replaceRun(run: RunRefMut, updateSplits: boolean): boolean;
    /**
     * Sets the Run object used by the Timer with the Run object provided. If the
     * Run provided contains no segments, it can't be used for timing and gets
     * returned again. If the Run object can be set, the original Run object in use
     * by the Timer is disposed by this method and null is returned.
     */
    setRun(run: Run): Run | null;
    /**
     * Starts the Timer if there is no attempt in progress. If that's not the
     * case, nothing happens.
     */
    start(): number;
    /**
     * If an attempt is in progress, stores the current time as the time of the
     * current split. The attempt ends if the last split time is stored.
     */
    split(): number;
    /**
     * Starts a new attempt or stores the current time as the time of the
     * current split. The attempt ends if the last split time is stored.
     */
    splitOrStart(): number;
    /**
     * Skips the current split if an attempt is in progress and the
     * current split is not the last split.
     */
    skipSplit(): number;
    /**
     * Removes the split time from the last split if an attempt is in progress
     * and there is a previous split. The Timer Phase also switches to
     * `Running` if it previously was `Ended`.
     */
    undoSplit(): number;
    /**
     * Resets the current attempt if there is one in progress. If the splits
     * are to be updated, all the information of the current attempt is stored
     * in the Run's history. Otherwise the current attempt's information is
     * discarded.
     */
    reset(updateSplits: boolean): number;
    /**
     * Resets the current attempt if there is one in progress. The splits are
     * updated such that the current attempt's split times are being stored as
     * the new Personal Best.
     */
    resetAndSetAttemptAsPb(): number;
    /**
     * Pauses an active attempt that is not paused.
     */
    pause(): number;
    /**
     * Resumes an attempt that is paused.
     */
    resume(): number;
    /**
     * Toggles an active attempt between `Paused` and `Running`.
     */
    togglePause(): number;
    /**
     * Toggles an active attempt between `Paused` and `Running` or starts an
     * attempt if there's none in progress.
     */
    togglePauseOrStart(): number;
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
    undoAllPauses(): number;
    /**
     * Sets the current Timing Method to the Timing Method provided.
     */
    setCurrentTimingMethod(method: number): void;
    /**
     * Toggles between the Real Time and Game Time timing methods.
     */
    toggleTimingMethod(): void;
    /**
     * Tries to set the current comparison to the comparison specified. If the
     * comparison doesn't exist false is returned.
     */
    setCurrentComparison(comparison: string): number;
    /**
     * Switches the current comparison to the next comparison in the list.
     */
    switchToNextComparison(): void;
    /**
     * Switches the current comparison to the previous comparison in the list.
     */
    switchToPreviousComparison(): void;
    /**
     * Initializes Game Time for the current attempt. Game Time automatically
     * gets uninitialized for each new attempt.
     */
    initializeGameTime(): number;
    /**
     * Deinitializes Game Time for the current attempt.
     */
    deinitializeGameTime(): void;
    /**
     * Pauses the Game Timer such that it doesn't automatically increment
     * similar to Real Time.
     */
    pauseGameTime(): number;
    /**
     * Resumes the Game Timer such that it automatically increments similar to
     * Real Time, starting from the Game Time it was paused at.
     */
    resumeGameTime(): number;
    /**
     * Sets the Game Time to the time specified. This also works if the Game
     * Time is paused, which can be used as a way of updating the Game Timer
     * periodically without it automatically moving forward. This ensures that
     * the Game Timer never shows any time that is not coming from the game.
     */
    setGameTime(time: TimeSpanRef): number;
    /**
     * Instead of setting the Game Time directly, this method can be used to
     * just specify the amount of time the game has been loading. The Game Time
     * is then automatically determined by Real Time - Loading Times.
     */
    setLoadingTimes(time: TimeSpanRef): number;
    /**
     * Sets the value of a custom variable with the name specified. If the variable
     * does not exist, a temporary variable gets created that will not be stored in
     * the splits file.
     */
    setCustomVariable(name: string, value: string): void;
    /**
     * Marks the Run as unmodified, so that it is known that all the changes
     * have been saved.
     */
    markAsUnmodified(): void;
}
/**
 * A Timer provides all the capabilities necessary for doing speedrun attempts.
 */
export declare class Timer extends TimerRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Timer based on a Run object storing all the information
     * about the splits. The Run object needs to have at least one segment, so
     * that the Timer can store the final time. If a Run object with no
     * segments is provided, the Timer creation fails and null is returned.
     */
    static new(run: Run): Timer | null;
    /**
     * Takes out the Run from the Timer and resets the current attempt if there
     * is one in progress. If the splits are to be updated, all the information
     * of the current attempt is stored in the Run's history. Otherwise the
     * current attempt's information is discarded.
     */
    intoRun(updateSplits: boolean): Run;
}
/**
 * The Timer Component is a component that shows the total time of the current
 * attempt as a digital clock. The color of the time shown is based on a how
 * well the current attempt is doing compared to the chosen comparison.
 */
export declare class TimerComponentRef {
    ptr: number;
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer and the layout
     * settings provided.
     */
    state(timer: TimerRef, layoutSettings: GeneralLayoutSettingsRef, lang: number): TimerComponentState;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Timer Component is a component that shows the total time of the current
 * attempt as a digital clock. The color of the time shown is based on a how
 * well the current attempt is doing compared to the chosen comparison.
 */
export declare class TimerComponentRefMut extends TimerComponentRef {
}
/**
 * The Timer Component is a component that shows the total time of the current
 * attempt as a digital clock. The color of the time shown is based on a how
 * well the current attempt is doing compared to the chosen comparison.
 */
export declare class TimerComponent extends TimerComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Timer Component.
     */
    static new(): TimerComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TimerComponentStateRef {
    ptr: number;
    /**
     * The time shown by the component without the fractional part.
     */
    time(): string;
    /**
     * The fractional part of the time shown (including the dot).
     */
    fraction(): string;
    /**
     * The text to measure when sizing the time without its fractional part. Covers
     * both the expected maximum and the currently displayed time, with all digits
     * normalized to `8`.
     */
    timeSizeHint(): string;
    /**
     * The fractional part (including the decimal separator) to reserve when
     * sizing the timer, with digits normalized to `8`. Measure it at the fraction's
     * scale.
     */
    fractionSizeHint(): string;
    /**
     * The semantic coloring information the time carries.
     */
    semanticColor(): string;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TimerComponentStateRefMut extends TimerComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TimerComponentState extends TimerComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Title Component is a component that shows the name of the game and the
 * category that is being run. Additionally, the game icon, the attempt count,
 * and the total number of successfully finished runs can be shown.
 */
export declare class TitleComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Title Component is a component that shows the name of the game and the
 * category that is being run. Additionally, the game icon, the attempt count,
 * and the total number of successfully finished runs can be shown.
 */
export declare class TitleComponentRefMut extends TitleComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(imageCache: ImageCacheRefMut, timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(imageCache: ImageCacheRefMut, timer: TimerRef, lang: number): TitleComponentState;
}
/**
 * The Title Component is a component that shows the name of the game and the
 * category that is being run. Additionally, the game icon, the attempt count,
 * and the total number of successfully finished runs can be shown.
 */
export declare class TitleComponent extends TitleComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Title Component.
     */
    static new(): TitleComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TitleComponentStateRef {
    ptr: number;
    /**
     * The game icon to show. The associated image can be looked up in the image
     * cache. The image may be the empty image. This indicates that there is no
     * icon.
     */
    icon(): string;
    /**
     * The first title line to show. This is either the game's name, or a
     * combination of the game's name and the category.
     */
    line1(): string;
    /**
     * By default the category name is shown on the second line. Based on the
     * settings, it can however instead be shown in a single line together with
     * the game name. In that case null is returned instead.
     */
    line2(): string | null;
    /**
     * Specifies whether the title should centered or aligned to the left
     * instead.
     */
    isCentered(): boolean;
    /**
     * Returns whether the amount of successfully finished attempts is supposed to
     * be shown.
     */
    showsFinishedRuns(): boolean;
    /**
     * Returns the amount of successfully finished attempts.
     */
    finishedRuns(): number;
    /**
     * Returns whether the amount of total attempts is supposed to be shown.
     */
    showsAttempts(): boolean;
    /**
     * Returns the amount of total attempts.
     */
    attempts(): number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TitleComponentStateRefMut extends TitleComponentStateRef {
}
/**
 * The state object describes the information to visualize for this component.
 */
export declare class TitleComponentState extends TitleComponentStateRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
}
/**
 * The Total Playtime Component is a component that shows the total amount of
 * time that the current category has been played for.
 */
export declare class TotalPlaytimeComponentRef {
    ptr: number;
    /**
     * This constructor is an implementation detail. Do not use this.
     */
    constructor(ptr: number);
}
/**
 * The Total Playtime Component is a component that shows the total amount of
 * time that the current category has been played for.
 */
export declare class TotalPlaytimeComponentRefMut extends TotalPlaytimeComponentRef {
    /**
     * Encodes the component's state information as JSON.
     */
    stateAsJson(timer: TimerRef, lang: number): any;
    /**
     * Calculates the component's state based on the timer provided.
     */
    state(timer: TimerRef, lang: number): KeyValueComponentState;
}
/**
 * The Total Playtime Component is a component that shows the total amount of
 * time that the current category has been played for.
 */
export declare class TotalPlaytimeComponent extends TotalPlaytimeComponentRefMut {
    /**
     * Disposes the object, allowing it to clean up all of its memory. You need
     * to call this for every object that you don't use anymore and hasn't
     * already been disposed.
     */
    [Symbol.dispose](): void;
    /**
     * Creates a new Total Playtime Component.
     */
    static new(): TotalPlaytimeComponent;
    /**
     * Converts the component into a generic component suitable for using with a
     * layout.
     */
    intoGeneric(): Component;
}
