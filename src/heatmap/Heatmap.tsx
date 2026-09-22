import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  ActivityDay,
  buildActivityRange,
  fetchCreatedAtRows,
} from "./activity";
import {
  addWeeks,
  endOfWeek,
  formatDateKey,
  parseDateKey,
  startOfWeek,
} from "./dates";
import "./Heatmap.css";

type DateRange = readonly [startDate: string, endDate: string];

type ActivityState = {
  activities: ActivityDay[];
  error: string | null;
  loading: boolean;
};

type TooltipState = {
  activity: ActivityDay;
  x: number;
  y: number;
};

const NUM_WEEKS = 25;
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
const tooltipDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const numberFormatter = new Intl.NumberFormat("en-US");

const rangeEndingAt = (endDate: Date): DateRange => {
  const end = endOfWeek(endDate);
  return [
    formatDateKey(startOfWeek(addWeeks(end, -NUM_WEEKS))),
    formatDateKey(end),
  ];
};

const useActivities = ([startDate, endDate]: DateRange): ActivityState => {
  const [state, setState] = useState<ActivityState>({
    activities: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    let canceled = false;

    void fetchCreatedAtRows(startDate, endDate)
      .then((rows) => {
        if (canceled) return;
        setState({
          activities: buildActivityRange(startDate, endDate, rows),
          error: null,
          loading: false,
        });
      })
      .catch((error: unknown) => {
        if (canceled) return;
        console.error("DB Activity Heatmap query failed", error);
        setState({
          activities: [],
          error: "Block activity could not be read from this DB graph.",
          loading: false,
        });
      });

    return () => {
      canceled = true;
    };
  }, [startDate, endDate]);

  return state;
};

const scaleCount = (count: number) =>
  Math.ceil(Math.min(Math.max(count, 0), 40) / 10);

const ActivityGrid = ({
  activities,
  today,
}: {
  activities: ActivityDay[];
  today: string;
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const width = Math.ceil(activities.length / 7) * 16;
  const monthLabels: Array<{ label: string; week: number }> = [];
  let previousMonth = -1;

  activities.forEach((activity, index) => {
    const date = parseDateKey(activity.date);
    const month = date.getMonth();
    if (month !== previousMonth) {
      monthLabels.push({
        label: monthFormatter.format(date),
        week: Math.floor(index / 7),
      });
      previousMonth = month;
    }
  });

  return (
    <>
      <svg
        className="calendar-heatmap"
        width={width}
        height="132"
        viewBox={`0 0 ${width} 132`}
        role="img"
        aria-label="Blocks created by day"
      >
        {monthLabels.map(({ label, week }) => (
          <text key={`${label}-${week}`} x={week * 16} y="9">
            {label}
          </text>
        ))}
        {activities.map((activity, index) => (
          <rect
            key={activity.date}
            x={Math.floor(index / 7) * 16}
            y={16 + (index % 7) * 16}
            width="12"
            height="12"
            rx="3"
            className={[
              `color-github-${scaleCount(activity.count)}`,
              today === activity.date ? "today" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerEnter={(event) =>
              setTooltip({
                activity,
                x: event.clientX,
                y: event.clientY,
              })
            }
            onPointerMove={(event) =>
              setTooltip({
                activity,
                x: event.clientX,
                y: event.clientY,
              })
            }
            onPointerLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      {tooltip && (
        <div
          className="heatmap-tooltip"
          role="tooltip"
          style={{
            left: tooltip.x - 12,
            top: tooltip.y - 48,
            transform: "translateX(-100%)",
          }}
        >
          <strong>{tooltipDateFormatter.format(parseDateKey(tooltip.activity.date))}</strong>
          <span>
            {numberFormatter.format(tooltip.activity.count)} blocks
          </span>
        </div>
      )}
    </>
  );
};

const HeatmapChart = ({
  range,
  today,
}: {
  range: DateRange;
  today: string;
}) => {
  const { activities, error, loading } = useActivities(range);
  const totalBlocks = useMemo(
    () => activities.reduce((total, day) => total + day.count, 0),
    [activities]
  );
  const weeks = Math.ceil(activities.length / 7);

  if (loading) {
    return <div className="heatmap-status">Loading block activity…</div>;
  }
  if (error) {
    return <div className="heatmap-status heatmap-error">{error}</div>;
  }

  return (
    <div style={{ width: `${weeks * 16}px` }}>
      <ActivityGrid activities={activities} today={today} />
      <div className="heatmap-total">
        Total blocks during this period:{" "}
        <strong>{numberFormatter.format(totalBlocks)}</strong>
      </div>
    </div>
  );
};

export const Heatmap = forwardRef<HTMLDivElement>(function Heatmap(_, ref) {
  const today = formatDateKey(new Date());
  const [range, setRange] = useState<DateRange>(() =>
    rangeEndingAt(parseDateKey(today))
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const moveRange = (weeks: number) => {
    const nextEndDate = addWeeks(parseDateKey(range[1]), weeks);
    setRange(rangeEndingAt(nextEndDate));
  };

  return (
    <section ref={ref} className="heatmap-root" aria-label="Block activity">
      <div className="heatmap-range">
        <span>From</span>
        <button type="button" onClick={() => moveRange(-12)}>
          {dateFormatter.format(parseDateKey(range[0]))}
        </button>
        <span>to</span>
        <button type="button" onClick={() => moveRange(12)}>
          {dateFormatter.format(parseDateKey(range[1]))}
        </button>
      </div>
      <HeatmapChart key={range.join(":")} range={range} today={today} />
    </section>
  );
});
