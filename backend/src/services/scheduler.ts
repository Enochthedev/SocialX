import { CronJob } from 'cron';
import { config } from '../config';
import { agentLogger } from '../utils/logger';
import { db } from '../database/client';

export type ScheduledActionType = 'tweet' | 'reply' | 'like' | 'retweet' | 'follow' | 'engage';

export interface ScheduledAction {
  id?: number;
  actionType: ScheduledActionType;
  scheduledFor: Date;
  payload: Record<string, unknown>;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

class SchedulerService {
  private jobs: Map<string, CronJob> = new Map();
  private isActive: boolean = false;

  async initialize(): Promise<void> {
    agentLogger.info('Initializing scheduler service');

    // Schedule periodic tasks
    this.schedulePeriodicTask('check-mentions', '*/5 * * * *', async () => {
      await this.checkAndProcessMentions();
    });

    this.schedulePeriodicTask('engage-with-timeline', '*/15 * * * *', async () => {
      await this.engageWithTimeline();
    });

    this.schedulePeriodicTask('generate-tweet', '0 */4 * * *', async () => {
      await this.generateAndScheduleTweet();
    });

    this.schedulePeriodicTask('process-scheduled-actions', '* * * * *', async () => {
      await this.processScheduledActions();
    });

    this.schedulePeriodicTask('cleanup-old-data', '0 0 * * *', async () => {
      await this.cleanupOldData();
    });

    this.isActive = true;
    agentLogger.info('Scheduler service initialized and active');
  }

  private schedulePeriodicTask(name: string, cronExpression: string, task: () => Promise<void>): void {
    const job = new CronJob(
      cronExpression,
      async () => {
        if (!this.isActive) return;

        try {
          agentLogger.debug(`Running scheduled task: ${name}`);
          await task();
        } catch (error) {
          agentLogger.error(`Scheduled task failed: ${name}`, { error });
        }
      },
      null,
      true,
      config.schedule.timezone
    );

    this.jobs.set(name, job);
    agentLogger.info(`Scheduled periodic task: ${name}`, { cron: cronExpression });
  }

  async scheduleAction(action: ScheduledAction): Promise<number> {
    try {
      const result = await db.query(
        `INSERT INTO scheduled_actions (action_type, scheduled_for, payload, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [action.actionType, action.scheduledFor, JSON.stringify(action.payload), 'pending']
      );

      const actionId = result.rows[0].id;
      agentLogger.info('Action scheduled', {
        id: actionId,
        type: action.actionType,
        scheduledFor: action.scheduledFor,
      });

      return actionId;
    } catch (error) {
      agentLogger.error('Failed to schedule action', { error, action });
      throw error;
    }
  }

  async cancelAction(actionId: number): Promise<void> {
    await db.query(
      `UPDATE scheduled_actions SET status = 'cancelled' WHERE id = $1`,
      [actionId]
    );
    agentLogger.info('Action cancelled', { actionId });
  }

  async processScheduledActions(): Promise<void> {
    try {
      const result = await db.query(
        `SELECT id, action_type, payload
         FROM scheduled_actions
         WHERE status = 'pending' AND scheduled_for <= NOW()
         ORDER BY scheduled_for ASC
         LIMIT 10`
      );

      const actions = result.rows;

      for (const action of actions) {
        try {
          agentLogger.info('Processing scheduled action', {
            id: action.id,
            type: action.action_type,
          });

          // Mark as processing
          await db.query(
            `UPDATE scheduled_actions SET status = 'processing' WHERE id = $1`,
            [action.id]
          );

          // Execute the action (will be implemented by agent service)
          // For now, just mark as completed
          await db.query(
            `UPDATE scheduled_actions
             SET status = 'completed', executed_at = NOW()
             WHERE id = $1`,
            [action.id]
          );

          agentLogger.info('Scheduled action completed', { id: action.id });
        } catch (error) {
          agentLogger.error('Failed to process scheduled action', {
            id: action.id,
            error,
          });

          await db.query(
            `UPDATE scheduled_actions
             SET status = 'failed', error_message = $2
             WHERE id = $1`,
            [action.id, String(error)]
          );
        }
      }
    } catch (error) {
      agentLogger.error('Failed to process scheduled actions', { error });
    }
  }

  private async checkAndProcessMentions(): Promise<void> {
    if (!config.engagement.replyToMentions) return;
    agentLogger.debug('Checking mentions...');
    // Will be implemented by agent service
  }

  private async engageWithTimeline(): Promise<void> {
    if (!config.engagement.engageWithTimeline) return;
    agentLogger.debug('Engaging with timeline...');
    // Will be implemented by agent service
  }

  private async generateAndScheduleTweet(): Promise<void> {
    if (!config.behavior.autoTweet) return;

    // Check if we're within active hours
    const now = new Date();
    const hour = now.getHours();

    if (hour < config.schedule.activeHoursStart || hour >= config.schedule.activeHoursEnd) {
      agentLogger.debug('Outside active hours, skipping tweet generation');
      return;
    }

    // Check daily tweet limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM scheduled_actions
       WHERE action_type = 'tweet'
         AND status IN ('completed', 'pending')
         AND created_at >= $1`,
      [today]
    );

    const todayCount = parseInt(result.rows[0].count);

    if (todayCount >= config.schedule.maxTweetsPerDay) {
      agentLogger.debug('Daily tweet limit reached', { count: todayCount });
      return;
    }

    agentLogger.debug('Generating tweet...');
    // Will be implemented by agent service
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // Clean up old completed/failed actions (keep last 30 days)
      await db.query(
        `DELETE FROM scheduled_actions
         WHERE status IN ('completed', 'failed', 'cancelled')
           AND created_at < NOW() - INTERVAL '30 days'`
      );

      // Clean up old activity logs (keep last 90 days)
      await db.query(
        `DELETE FROM agent_activity_log
         WHERE created_at < NOW() - INTERVAL '90 days'`
      );

      agentLogger.info('Old data cleaned up');
    } catch (error) {
      agentLogger.error('Failed to cleanup old data', { error });
    }
  }

  isWithinActiveHours(): boolean {
    const hour = new Date().getHours();
    return hour >= config.schedule.activeHoursStart && hour < config.schedule.activeHoursEnd;
  }

  getNextTweetTime(): Date {
    const now = new Date();
    const nextTime = new Date(now.getTime() + config.schedule.minTweetIntervalHours * 60 * 60 * 1000);

    // Ensure it's within active hours
    const nextHour = nextTime.getHours();
    if (nextHour < config.schedule.activeHoursStart) {
      nextTime.setHours(config.schedule.activeHoursStart, 0, 0, 0);
    } else if (nextHour >= config.schedule.activeHoursEnd) {
      // Schedule for next day's active hours start
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(config.schedule.activeHoursStart, 0, 0, 0);
    }

    return nextTime;
  }

  stop(): void {
    this.isActive = false;
    this.jobs.forEach((job, name) => {
      job.stop();
      agentLogger.info(`Stopped scheduled task: ${name}`);
    });
    this.jobs.clear();
    agentLogger.info('Scheduler service stopped');
  }
}

export const schedulerService = new SchedulerService();
