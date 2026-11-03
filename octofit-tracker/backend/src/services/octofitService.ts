import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)
    || typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId)
    || typeof type !== 'string' || type.trim().length === 0
    || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity fields are invalid'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 400 });
  }

  const occurredAt = new Date();
  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt,
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0
    || typeof mascot !== 'string' || mascot.trim().length === 0
    || !Array.isArray(members)) {
    throw Object.assign(new Error('Team fields are invalid'), { status: 400 });
  }

  const memberIds = [...new Set(members)];
  if (memberIds.some((memberId) => typeof memberId !== 'string' || !Types.ObjectId.isValid(memberId))) {
    throw Object.assign(new Error('Team member IDs are invalid'), { status: 400 });
  }

  const users = await User.find({ _id: { $in: memberIds } }).select('_id team').lean();
  if (users.length !== memberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 400 });
  }

  const team = await Team.create({ name, mascot, members: memberIds });
  const previousTeamIds = users
    .map((user) => user.team)
    .filter((teamId) => teamId && teamId.toString() !== team._id.toString());
  if (previousTeamIds.length > 0) {
    await Team.updateMany(
      { _id: { $in: previousTeamIds } },
      { $pull: { members: { $in: memberIds } } },
    );
  }
  if (memberIds.length > 0) {
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate([{ $group: { _id: '$team', totalPoints: { $sum: '$points' } } }]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

function focusForActivity(type: string) {
  const normalizedType = type.trim().toLowerCase();
  if (['run', 'running', 'cycle', 'cycling', 'walk', 'walking', 'swim', 'swimming', 'cardio'].includes(normalizedType)) {
    return 'endurance';
  }
  if (['strength', 'weight', 'weights', 'resistance'].includes(normalizedType)) return 'strength';
  return normalizedType;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).select('type').lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal.trim().toLowerCase();

  return workouts
    .map((workout) => {
      const workoutFocus = workout.focus.trim().toLowerCase();
      const matchingActivity = recentActivities.find((activity) => focusForActivity(activity.type) === workoutFocus);
      const matchesGoal = workoutFocus === goal;
      const reason = matchesGoal && matchingActivity
        ? `Matches your ${user.fitnessGoal} goal and recent ${matchingActivity.type} activity.`
        : matchesGoal
          ? `Matches your ${user.fitnessGoal} fitness goal.`
          : matchingActivity
            ? `Matches your recent ${matchingActivity.type} activity.`
            : `An alternative for your ${user.fitnessGoal} goal.`;
      return {
        ...workout,
        reason,
        priority: (matchesGoal ? 2 : 0) + (matchingActivity ? 1 : 0),
      };
    })
    .sort((left, right) => right.priority - left.priority || (left.title ?? '').localeCompare(right.title ?? ''))
    .map(({ priority: _priority, ...workout }) => workout);
}

export { User };
