import { redis } from "@/lib/redis";
import { getDate } from "@/utils";
import { parse } from 'date-fns';

type AnalyticsArgs = {
  retention?: number;
};

type TrackOptions = {
  persist?: boolean;
};

export class Analytics {
  private retention: number = 60 * 60 * 24 * 7; // Default to 7 days

  constructor(opts?: AnalyticsArgs) {
    if (opts?.retention !== undefined) {
      this.retention = opts.retention;
    }
  }

  async track(namespace: string, event: object = {}, opts?: TrackOptions) {
    let key = `analytics::${namespace}`;

    if (!opts?.persist) {
      key += `_${getDate()}`;
    }

    await redis.hincrby(key, JSON.stringify(event), 1);

    if (!opts?.persist) {
      await redis.expire(key, this.retention);
    }
  }

  async retrieveDays(namespace: string, nDays: number) {
    type AnalyticsPromise = ReturnType<typeof analytics.retrieve>;
    const promises: AnalyticsPromise[] = [];

    for (let i = 0; i < nDays; i++) {
      const formattedDate = getDate(i);
      const promise = this.retrieve(namespace, formattedDate);
      promises.push(promise);
    }

    const fetched = await Promise.all(promises);

    // Sort fetched data based on date in descending order
    const sortedData = fetched.sort((a, b) => {
      const dateA = parse(a.date, 'dd/MM/yyyy', new Date());
      const dateB = parse(b.date, 'dd/MM/yyyy', new Date());

      if (dateA > dateB) {
        return -1;
      } else if (dateA < dateB) {
        return 1;
      } else {
        return 0;
      }
    });

    return sortedData;
  }

  async retrieve(namespace: string, date: string) {
    const res = await redis.hgetall<Record<string, string>>(`analytics::${namespace}::${date}`);

    const events = Object.entries(res ?? []).map(([key, value]) => ({
      [key]: Number(value),
    }));

    return {
      date,
      events,
    };
  }
}

export const analytics = new Analytics();
