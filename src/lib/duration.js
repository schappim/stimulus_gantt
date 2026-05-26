// Duration parsing.
//
// Accepts:
//   - number   → seconds
//   - string   → "5d", "08:00", "1h", "30m", "P1DT2H" (subset of ISO 8601),
//                or compound "1d 2h" / "1w 3d"
//   - object   → { years?, months?, weeks?, days?, hours?, minutes?, seconds? }
//
// Returns normalised:  { years, months, days, seconds }
// (Weeks roll into days.)

const SECOND = 1;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

const UNIT_MULT = {
  s: SECOND, sec: SECOND, secs: SECOND, second: SECOND, seconds: SECOND,
  m: MINUTE, min: MINUTE, mins: MINUTE, minute: MINUTE, minutes: MINUTE,
  h: HOUR, hr: HOUR, hrs: HOUR, hour: HOUR, hours: HOUR,
  d: DAY, day: DAY, days: DAY,
  w: WEEK, wk: WEEK, week: WEEK, weeks: WEEK,
};

export function parseDuration(input) {
  if (input == null) return { years: 0, months: 0, days: 0, seconds: 0 };
  if (typeof input === 'number') {
    return splitSeconds(input);
  }
  if (typeof input === 'string') {
    return parseDurationString(input);
  }
  if (typeof input === 'object') {
    const weeks = +(input.weeks || input.week || 0);
    return {
      years: +(input.years || input.year || 0),
      months: +(input.months || input.month || 0),
      days: weeks * 7 + +(input.days || input.day || 0),
      seconds:
        +(input.hours || input.hour || 0) * HOUR +
        +(input.minutes || input.minute || 0) * MINUTE +
        +(input.seconds || input.second || 0),
    };
  }
  return { years: 0, months: 0, days: 0, seconds: 0 };
}

export const createDuration = parseDuration;

function parseDurationString(str) {
  const s = str.trim();
  if (!s) return { years: 0, months: 0, days: 0, seconds: 0 };

  // hh:mm or hh:mm:ss → seconds.
  if (/^\d+(:\d+){1,2}$/.test(s)) {
    let seconds = 0;
    const parts = s.split(':');
    const mult = [HOUR, MINUTE, SECOND];
    parts.forEach((p, i) => {
      seconds += parseInt(p, 10) * mult[i];
    });
    return splitSeconds(seconds);
  }

  // ISO 8601 subset: P[n]Y[n]M[n]DT[n]H[n]M[n]S
  if (/^[Pp]/.test(s)) {
    return parseIso8601Duration(s);
  }

  // Compound "1w 2d 3h 4m 5s" or "5d" or "30m".
  const re = /(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g;
  let m;
  let seconds = 0;
  let days = 0;
  let months = 0;
  let years = 0;
  let matched = false;
  while ((m = re.exec(s)) !== null) {
    matched = true;
    const n = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    if (UNIT_MULT[u] != null) {
      const sec = n * UNIT_MULT[u];
      if (u.startsWith('w') || u.startsWith('d')) {
        days += sec / DAY;
      } else {
        seconds += sec;
      }
    } else if (u === 'mo' || u === 'mon' || u === 'months' || u === 'month') {
      months += n;
    } else if (u === 'y' || u === 'yr' || u === 'yrs' || u === 'year' || u === 'years') {
      years += n;
    }
  }
  if (!matched) {
    // bare number → seconds
    const n = parseFloat(s);
    if (Number.isFinite(n)) return splitSeconds(n);
    return { years: 0, months: 0, days: 0, seconds: 0 };
  }
  return {
    years,
    months,
    days: Math.trunc(days) + Math.trunc(seconds / DAY),
    seconds: seconds % DAY + (days - Math.trunc(days)) * DAY,
  };
}

function parseIso8601Duration(str) {
  const re = /^P(?:(-?\d+(?:\.\d+)?)Y)?(?:(-?\d+(?:\.\d+)?)M)?(?:(-?\d+(?:\.\d+)?)W)?(?:(-?\d+(?:\.\d+)?)D)?(?:T(?:(-?\d+(?:\.\d+)?)H)?(?:(-?\d+(?:\.\d+)?)M)?(?:(-?\d+(?:\.\d+)?)S)?)?$/i;
  const m = str.match(re);
  if (!m) return { years: 0, months: 0, days: 0, seconds: 0 };
  const [, y, mo, w, d, h, mi, se] = m.map((x) => x == null ? 0 : parseFloat(x));
  return {
    years: y,
    months: mo,
    days: (w * 7) + d,
    seconds: h * HOUR + mi * MINUTE + se,
  };
}

function splitSeconds(totalSeconds) {
  const sign = totalSeconds < 0 ? -1 : 1;
  const abs = Math.abs(totalSeconds);
  const days = Math.floor(abs / DAY);
  const seconds = abs - days * DAY;
  return { years: 0, months: 0, days: sign * days, seconds: sign * seconds };
}

// Total seconds the duration contributes ignoring years/months (which need
// an anchor date to resolve).
export function durationToSeconds(d) {
  if (!d) return 0;
  return d.days * DAY + d.seconds;
}

// Total ms ignoring years/months.
export function durationToMs(d) {
  return durationToSeconds(d) * 1000;
}

export function addDurationToDate(date, dur, x = 1) {
  if (!dur) return date;
  const d = new Date(date.getTime());
  if (dur.years) d.setUTCFullYear(d.getUTCFullYear() + x * dur.years);
  if (dur.months) d.setUTCMonth(d.getUTCMonth() + x * dur.months);
  if (dur.days) d.setUTCDate(d.getUTCDate() + x * dur.days);
  if (dur.seconds) d.setUTCSeconds(d.getUTCSeconds() + x * dur.seconds);
  return d;
}

// Human-readable label. "5d", "1d 2h", "30m", "08:00".
export function formatDuration(d, { units = 'auto' } = {}) {
  if (!d) return '0';
  const total = durationToSeconds(d);
  if (total === 0 && !d.years && !d.months) return '0';
  if (units === 'hhmm') {
    const sign = total < 0 ? '-' : '';
    const abs = Math.abs(total);
    const h = Math.floor(abs / HOUR);
    const m = Math.round((abs - h * HOUR) / MINUTE);
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const parts = [];
  if (d.years) parts.push(`${d.years}y`);
  if (d.months) parts.push(`${d.months}mo`);
  const days = d.days;
  if (days) parts.push(`${days}d`);
  if (d.seconds) {
    const hours = d.seconds / HOUR;
    if (hours === Math.trunc(hours)) parts.push(`${hours}h`);
    else if (d.seconds % MINUTE === 0) parts.push(`${d.seconds / MINUTE}m`);
    else parts.push(`${d.seconds}s`);
  }
  return parts.join(' ') || '0';
}
