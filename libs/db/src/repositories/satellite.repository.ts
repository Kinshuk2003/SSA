import { and, asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  Satellite,
  SatelliteQuery,
  SatelliteUpsertRow,
  PaginatedResponse,
} from '@ssa/shared';
import type { Db } from '../client';
import { satellites } from '../schema/satellites.table';
import type { DbSatellite } from '../schema/satellites.table';
import { satelliteChangeLog } from '../schema/change-log.table';
import type { ISatelliteRepository, UpsertStats, ChangeLogEntry } from './satellite.repository.interface';


const SORT_COL = {
  norad_cat_id: satellites.norad_cat_id,
  object_name:  satellites.object_name,
  launch_date:  satellites.launch_date,
  period:       satellites.period,
  inclination:  satellites.inclination,
  apogee:       satellites.apogee,
  perigee:      satellites.perigee,
} as const;

const SORT_CAST: Record<string, string> = {
  norad_cat_id: 'integer',
  object_name:  'varchar',
  launch_date:  'date',
  period:       'numeric',
  inclination:  'numeric',
  apogee:       'integer',
  perigee:      'integer',
};


interface CursorPayload { val: string | null; id: number }

function encodeCursor(row: DbSatellite, sortBy: string): string {
  const raw = row[sortBy as keyof DbSatellite];
  const val = raw != null ? String(raw) : null;
  return Buffer.from(JSON.stringify({ val, id: row.norad_cat_id })).toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as CursorPayload;
}


function toDto(row: DbSatellite): Satellite {
  return {
    norad_cat_id:     row.norad_cat_id,
    object_name:      row.object_name,
    object_id:        row.object_id,
    object_type:      row.object_type as Satellite['object_type'],
    ops_status:       row.ops_status  as Satellite['ops_status'],
    owner:            row.owner,
    launch_site:      row.launch_site,
    launch_date:      row.launch_date,
    decay_date:       row.decay_date,
    period:           row.period      != null ? parseFloat(row.period)      : null,
    inclination:      row.inclination != null ? parseFloat(row.inclination) : null,
    apogee:           row.apogee,
    perigee:          row.perigee,
    rcs:              row.rcs        as Satellite['rcs'],
    data_status_code: row.data_status_code,
    orbit_center:     row.orbit_center,
    orbit_type:       row.orbit_type  as Satellite['orbit_type'],
    content_hash:     row.content_hash,
    created_at:       row.created_at.toISOString(),
    updated_at:       row.updated_at.toISOString(),
  };
}


function toDbRow(row: SatelliteUpsertRow) {
  return {
    ...row,
    period:      row.period      != null ? String(row.period)      : null,
    inclination: row.inclination != null ? String(row.inclination) : null,
  };
}

export class SatelliteRepository implements ISatelliteRepository {
  constructor(private readonly db: Db) {}

  async findMany(query: SatelliteQuery): Promise<PaginatedResponse<Satellite>> {
    const { sort_by, sort_order, limit, cursor, search, object_type, ops_status, orbit_type, owner } = query;

    const col = SORT_COL[sort_by];
    const cast = SORT_CAST[sort_by];

    const filterConds: SQL[] = [];
    if (search)      filterConds.push(ilike(satellites.object_name, `%${search}%`));
    if (object_type) filterConds.push(eq(satellites.object_type, object_type));
    if (ops_status)  filterConds.push(eq(satellites.ops_status, ops_status));
    if (orbit_type)  filterConds.push(eq(satellites.orbit_type, orbit_type));
    if (owner)       filterConds.push(ilike(satellites.owner, `%${owner}%`));

    const filterWhere = filterConds.length > 0 ? and(...filterConds) : undefined;

    const pageConds: SQL[] = [...filterConds];
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded.val === null) {
        pageConds.push(
          sql`(${col} IS NULL AND ${satellites.norad_cat_id} > ${decoded.id})`,
        );
      } else {
        const v = decoded.val;
        if (sort_order === 'asc') {
          pageConds.push(sql`(
            ${col} > CAST(${v} AS ${sql.raw(cast)})
            OR (${col} = CAST(${v} AS ${sql.raw(cast)}) AND ${satellites.norad_cat_id} > ${decoded.id})
            OR ${col} IS NULL
          )`);
        } else {
          pageConds.push(sql`(
            ${col} < CAST(${v} AS ${sql.raw(cast)})
            OR (${col} = CAST(${v} AS ${sql.raw(cast)}) AND ${satellites.norad_cat_id} > ${decoded.id})
            OR ${col} IS NULL
          )`);
        }
      }
    }

    const pageWhere = pageConds.length > 0 ? and(...pageConds) : undefined;

    const sortSql =
      sort_order === 'asc'
        ? sql`${col} ASC NULLS LAST`
        : sql`${col} DESC NULLS LAST`;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ total: sql<number>`COUNT(*)::integer` })
        .from(satellites)
        .where(filterWhere),
      this.db
        .select()
        .from(satellites)
        .where(pageWhere)
        .orderBy(sortSql, asc(satellites.norad_cat_id))
        .limit(limit + 1),
    ]);

    const total    = countResult[0]?.total ?? 0;
    const hasNext  = rows.length > limit;
    const page     = rows.slice(0, limit);
    const nextCursor = hasNext ? encodeCursor(page[limit - 1], sort_by) : null;

    return {
      data:      page.map(toDto),
      nextCursor,
      total,
      page_size: limit,
    };
  }

  async findByNoradId(id: number): Promise<Satellite | null> {
    const [row] = await this.db
      .select()
      .from(satellites)
      .where(eq(satellites.norad_cat_id, id))
      .limit(1);
    return row ? toDto(row) : null;
  }

  async upsertMany(rows: SatelliteUpsertRow[]): Promise<UpsertStats> {
    if (rows.length === 0) return { upserted: 0, skipped: 0 };

    const inserted = await this.db
      .insert(satellites)
      .values(rows.map(toDbRow))
      .onConflictDoUpdate({
        target: satellites.norad_cat_id,
        set: {
          object_name:      sql`EXCLUDED.object_name`,
          object_id:        sql`EXCLUDED.object_id`,
          object_type:      sql`EXCLUDED.object_type`,
          ops_status:       sql`EXCLUDED.ops_status`,
          owner:            sql`EXCLUDED.owner`,
          launch_site:      sql`EXCLUDED.launch_site`,
          launch_date:      sql`EXCLUDED.launch_date`,
          decay_date:       sql`EXCLUDED.decay_date`,
          period:           sql`EXCLUDED.period`,
          inclination:      sql`EXCLUDED.inclination`,
          apogee:           sql`EXCLUDED.apogee`,
          perigee:          sql`EXCLUDED.perigee`,
          rcs:              sql`EXCLUDED.rcs`,
          data_status_code: sql`EXCLUDED.data_status_code`,
          orbit_center:     sql`EXCLUDED.orbit_center`,
          orbit_type:       sql`EXCLUDED.orbit_type`,
          content_hash:     sql`EXCLUDED.content_hash`,
          updated_at:       sql`NOW()`,
        },
        where: sql`${satellites.content_hash} IS DISTINCT FROM EXCLUDED.content_hash`,
      })
      .returning({ norad_cat_id: satellites.norad_cat_id });

    return {
      upserted: inserted.length,
      skipped:  rows.length - inserted.length,
    };
  }

  async findManyByNoradIds(ids: number[]): Promise<Satellite[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(satellites)
      .where(inArray(satellites.norad_cat_id, ids));
    return rows.map(toDto);
  }

  async bulkFetchHashes(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();

    const rows = await this.db
      .select({
        norad_cat_id: satellites.norad_cat_id,
        content_hash: satellites.content_hash,
      })
      .from(satellites)
      .where(inArray(satellites.norad_cat_id, ids));

    return new Map(rows.map((r) => [r.norad_cat_id, r.content_hash]));
  }

  async insertChangeLogs(entries: ChangeLogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.db.insert(satelliteChangeLog).values(entries);
  }
}
