/**
 * Booking engine for a train coach.
 *
 * A coach is stored as a binary matrix (bookingState): 0 = free, 1 = booked.
 * For fast lookups every row keeps a "section map": the list of contiguous free
 * runs in that row ({ start, len }). Booking never rescans the whole coach, it
 * only reads the section maps.
 *
 * See bookIfAvailableAdjacent for the selection strategy.
 */
const MAX_SEATS_PER_BOOKING = 7;

// n choose k: how many seat combinations a brute-force search would have to test.
function combinations(n, k) {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

class BookingService {
  constructor(coach) {
    const t0 = process.hrtime.bigint();
    this.coach = coach;
    this.totalSeats = coach.totalSeats;
    this.noOfSeatsInRow = coach.seatsInRows;
    this.mat = this.convertBinaryToMatrix(coach.bookingState || []);
    this.rowMap = new Map();
    this.generateRowMap();
    this.availableSeats = this.countFree();
    this.indexedCells = this.mat.reduce((n, row) => n + row.length, 0);
    this.indexMs = Number(process.hrtime.bigint() - t0) / 1e6;
  }

  convertMatrixToBinary(mat) {
    return mat.map((row) => row.map((seat) => (seat.booked ? 1 : 0)));
  }

  // Seat numbers are 1-based and continue across rows.
  convertBinaryToMatrix(mat) {
    let counter = 1;
    return mat.map((row) =>
      row.map((cell) => {
        const seat = { number: counter, id: counter, booked: cell === 1 };
        counter++;
        return seat;
      })
    );
  }

  countFree() {
    let free = 0;
    for (const row of this.mat) for (const seat of row) if (!seat.booked) free++;
    return free;
  }

  // Empty coach built from totalSeats / seatsInRows.
  generateMatrix() {
    const mat = [];
    let counter = 1;
    while (counter <= this.totalSeats) {
      const row = [];
      for (let j = 0; j < this.noOfSeatsInRow && counter <= this.totalSeats; j++) {
        row.push({ number: counter, id: counter, booked: false });
        counter++;
      }
      mat.push(row);
    }
    this.mat = mat;
    this.generateRowMap();
    this.availableSeats = this.totalSeats;
    return this.buildResponse([]);
  }

  generateRowMap() {
    this.rowMap.clear();
    for (let i = 0; i < this.mat.length; i++) this.updateRowMap(i);
  }

  // Contiguous free runs of a row: [{ start, len }]
  updateRowMap(rowIdx) {
    const sections = [];
    const row = this.mat[rowIdx];
    let start = -1;
    for (let i = 0; i <= row.length; i++) {
      const free = i < row.length && !row[i].booked;
      if (free && start === -1) start = i;
      if (!free && start !== -1) {
        sections.push({ start, len: i - start });
        start = -1;
      }
    }
    this.rowMap.set(rowIdx, sections);
  }

  /**
   * Books `count` seats as close together as possible and returns the booking
   * together with an `explain` object describing how the seats were chosen.
   *
   * Step 1, O(rows x runs): read the per-row free-run lookup table. A run of exactly
   *   `count` seats wins (tightest row), otherwise the smallest run that is big enough.
   *   No seat is scanned individually.
   * Step 2, no single run is big enough: compact-window search. For every window of
   *   `h` consecutive rows (h grows only while it can still beat the best cost) a
   *   two-pointer sweep over per-column free counts finds the narrowest column span
   *   holding `count` free seats. cost = (rows spanned - 1) + (columns spanned - 1),
   *   i.e. the Manhattan size of the group's bounding box. O(rows x h x cols) time,
   *   O(cols) extra space.
   * Brute force would have to test every C(free, count) combination of seats.
   */
  bookIfAvailableAdjacent(count) {
    const t0 = process.hrtime.bigint();
    const stats = { rowsInspected: 0, runsInspected: 0, windowsEvaluated: 0 };
    const freeBefore = this.availableSeats;
    const plan = this.selectPlan(count, stats);

    const booked = plan.cells.map(([r, c]) => {
      this.mat[r][c].booked = true;
      return this.mat[r][c];
    });
    const rows = [...new Set(plan.cells.map(([r]) => r))];
    rows.forEach((r) => this.updateRowMap(r));
    this.availableSeats -= booked.length;

    const timeMs = Number(process.hrtime.bigint() - t0) / 1e6 + this.indexMs;
    const explain = this.buildExplain(plan, count, freeBefore, stats, timeMs);
    return this.buildResponse(booked, explain);
  }

  // Validates the request and picks the seats without touching the matrix.
  selectPlan(count, stats) {
    if (!Number.isInteger(count) || count < 1 || count > MAX_SEATS_PER_BOOKING) {
      throw new RangeError(`You can book between 1 and ${MAX_SEATS_PER_BOOKING} seats at a time`);
    }
    if (this.availableSeats === 0) throw new RangeError('The coach is full');
    if (this.availableSeats < count) {
      throw new RangeError(`Only ${this.availableSeats} seat(s) left in this coach`);
    }
    return this.findRun(count, stats) || this.findCompactWindow(count, stats);
  }

  // Which seats the next booking of `count` would get. Nothing is booked.
  preview(count) {
    const plan = this.selectPlan(count, { rowsInspected: 0, runsInspected: 0, windowsEvaluated: 0 });
    return { seats: plan.cells.map(([r, c]) => this.mat[r][c].number), strategy: plan.strategy };
  }

  // Step 1: free-run lookup table.
  findRun(count, stats) {
    let exact = null; // tightest row holding a run of exactly `count`
    let fit = null; // smallest run longer than `count`
    for (let i = 0; i < this.mat.length; i++) {
      const sections = this.rowMap.get(i);
      stats.rowsInspected++;
      if (sections.length === 0) continue;
      stats.runsInspected += sections.length;
      const free = sections.reduce((sum, sec) => sum + sec.len, 0);
      for (const sec of sections) {
        if (sec.len === count) {
          if (!exact || free < exact.free) exact = { row: i, start: sec.start, free };
        } else if (sec.len > count && (!fit || sec.len < fit.len)) {
          fit = { row: i, start: sec.start, len: sec.len };
        }
      }
    }
    const pick = exact || fit;
    if (!pick) return null;
    const cells = Array.from({ length: count }, (_, k) => [pick.row, pick.start + k]);
    return exact
      ? { strategy: 'adjacent-exact', cells, row: exact.row, run: count, rowFree: exact.free }
      : { strategy: 'adjacent-fit', cells, row: fit.row, run: fit.len };
  }

  // Step 2: compact window search over row windows and column spans.
  findCompactWindow(count, stats) {
    const rows = this.mat.length;
    const cols = Math.max(...this.mat.map((r) => r.length));
    let best = null;

    for (let r = 0; r < rows; r++) {
      const colFree = new Array(cols).fill(0);
      let total = 0;
      for (let h = 1; r + h <= rows; h++) {
        if (best && h - 1 >= best.cost) break; // a taller window cannot beat the best
        this.mat[r + h - 1].forEach((seat, c) => {
          if (!seat.booked) {
            colFree[c]++;
            total++;
          }
        });
        if (total < count) continue;
        stats.windowsEvaluated++;

        // narrowest column span holding `count` free seats (two pointers)
        let lo = 0;
        let sum = 0;
        let span = null;
        for (let hi = 0; hi < cols; hi++) {
          sum += colFree[hi];
          while (sum - colFree[lo] >= count) sum -= colFree[lo++];
          if (sum >= count && (!span || hi - lo < span.hi - span.lo)) span = { lo, hi };
        }
        const cost = h - 1 + (span.hi - span.lo);
        if (!best || cost < best.cost || (cost === best.cost && h < best.h)) {
          best = { r, h, lo: span.lo, hi: span.hi, cost };
        }
      }
    }

    // keep the `count` free seats nearest to the centre of the chosen box
    const cr = best.r + (best.h - 1) / 2;
    const cc = (best.lo + best.hi) / 2;
    const cand = [];
    for (let i = best.r; i < best.r + best.h; i++) {
      for (let j = best.lo; j <= best.hi; j++) {
        if (this.mat[i][j] && !this.mat[i][j].booked) {
          cand.push({ cell: [i, j], d: Math.abs(i - cr) + Math.abs(j - cc) });
        }
      }
    }
    cand.sort((a, b) => a.d - b.d || a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1]);
    const cells = cand.slice(0, count).map((x) => x.cell).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const rowSet = [...new Set(cells.map(([r]) => r))];
    return {
      strategy: rowSet.length === 1 ? 'same-row-gaps' : 'multi-row',
      cells,
      row: rowSet[0],
      rowFrom: rowSet[0],
      rowTo: rowSet[rowSet.length - 1],
      colFrom: Math.min(...cells.map(([, c]) => c)),
      colTo: Math.max(...cells.map(([, c]) => c)),
      cost: best.cost,
    };
  }

  buildExplain(plan, count, freeBefore, stats, timeMs) {
    const nums = plan.cells.map(([r, c]) => this.mat[r][c].number).join(', ');
    const word = count === 1 ? 'seat' : 'seats';
    const lookup = 'Read the per-row free-run table instead of scanning seat by seat.';
    let title;
    let summary;
    let steps;
    switch (plan.strategy) {
      case 'adjacent-exact':
        title = 'Perfect fit: side by side';
        summary = `All ${count} ${word} are in row ${plan.row + 1}, next to each other. That row had a free run of exactly ${count}.`;
        steps = [
          lookup,
          `Row ${plan.row + 1} has a free run of exactly ${count}, so nothing is left over.`,
          `Several rows could fit, so the row with the fewest free seats (${plan.rowFree}) was used. That keeps emptier rows for bigger groups.`,
        ];
        break;
      case 'adjacent-fit':
        title = 'Best fit: side by side';
        summary = `All ${count} ${word} are in row ${plan.row + 1}, next to each other, taken from the tightest free run that was big enough.`;
        steps = [
          lookup,
          `No row had a run of exactly ${count}.`,
          `The smallest run that fits is ${plan.run} seats long in row ${plan.row + 1}, so the group takes its first ${count} seats. Bigger runs stay free for bigger groups.`,
        ];
        break;
      case 'same-row-gaps':
        title = 'Same row, as close as possible';
        summary = `No row had ${count} free seats side by side, so the seats are all in row ${plan.row + 1}, inside the narrowest span (${plan.colTo - plan.colFrom + 1} seats wide) that holds ${count} free seats.`;
        steps = [
          lookup,
          `No free run was long enough for ${count} adjacent seats.`,
          `Swept each row window with two pointers to find the narrowest span of columns with ${count} free seats.`,
          'Booked seats in between mean the group has small gaps, which is the closest possible here.',
        ];
        break;
      default:
        title = 'Closest group across rows';
        summary = `No single row could hold the group, so the seats are the most compact cluster across rows ${plan.rowFrom + 1} to ${plan.rowTo + 1} (box ${plan.rowTo - plan.rowFrom + 1} rows x ${plan.colTo - plan.colFrom + 1} columns).`;
        steps = [
          lookup,
          `No free run was long enough for ${count} adjacent seats.`,
          'Tried windows of 1, 2, 3 ... consecutive rows. A two-pointer sweep over per-column free counts found the narrowest column span in each.',
          `Chose the window with the smallest bounding box (rows spanned + columns spanned = ${plan.cost}) and kept the ${count} free seats nearest its centre.`,
          'Windows taller than the best box found so far were skipped.',
        ];
    }
    return {
      strategy: plan.strategy,
      title,
      summary,
      steps,
      seats: nums,
      metrics: {
        timeMs: Math.round(timeMs * 1000) / 1000,
        rowsInspected: stats.rowsInspected,
        runsInspected: stats.runsInspected,
        windowsEvaluated: stats.windowsEvaluated,
        seatsIndexed: this.mat.reduce((n, row) => n + row.length, 0),
        bruteForceCombinations: combinations(freeBefore, count),
        timeComplexity: stats.windowsEvaluated ? 'O(R x h x C)' : 'O(R x runs)',
        spaceComplexity: stats.windowsEvaluated ? 'O(C)' : 'O(R x runs)',
      },
    };
  }

  // Fills the coach with random bookings (~40% taken).
  fillArrayWithRandomValues() {
    this.generateMatrix();
    for (const row of this.mat) for (const seat of row) seat.booked = Math.random() < 0.4;
    this.generateRowMap();
    this.availableSeats = this.countFree();
    return this.buildResponse([]);
  }

  buildResponse(bookedSeats, explain = null) {
    this.coach.bookingState = this.convertMatrixToBinary(this.mat);
    this.coach.availableSeats = this.availableSeats;
    this.coach.totalSeats = this.totalSeats;
    this.coach.seatsInRows = this.noOfSeatsInRow;
    return { coach: this.coach, bookedSeat: bookedSeats, explain };
  }
}

module.exports = { BookingService, MAX_SEATS_PER_BOOKING };
