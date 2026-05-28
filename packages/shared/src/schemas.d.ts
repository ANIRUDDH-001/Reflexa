import { z } from 'zod';
export declare const SystemPromptVersion: z.ZodObject<
  {
    version: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    version: string;
    notes?: string | undefined;
  },
  {
    version: string;
    notes?: string | undefined;
  }
>;
export declare const UserSettings: z.ZodObject<
  {
    userId: z.ZodString;
    preferredDifficulty: z.ZodDefault<z.ZodEnum<['easy', 'medium', 'hard']>>;
    notifyOnReview: z.ZodDefault<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    userId: string;
    preferredDifficulty: 'easy' | 'medium' | 'hard';
    notifyOnReview: boolean;
  },
  {
    userId: string;
    preferredDifficulty?: 'easy' | 'medium' | 'hard' | undefined;
    notifyOnReview?: boolean | undefined;
  }
>;
export declare const Question: z.ZodObject<
  {
    id: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    difficulty: z.ZodDefault<z.ZodEnum<['easy', 'medium', 'hard']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    title: string;
    body: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags?: string[] | undefined;
  },
  {
    id: string;
    title: string;
    body: string;
    tags?: string[] | undefined;
    difficulty?: 'easy' | 'medium' | 'hard' | undefined;
  }
>;
export declare const Answer: z.ZodObject<
  {
    id: z.ZodString;
    questionId: z.ZodString;
    authorId: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    submittedAt: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    questionId: string;
    authorId: string;
    submittedAt: string;
    code?: string | undefined;
    text?: string | undefined;
  },
  {
    id: string;
    questionId: string;
    authorId: string;
    submittedAt: string;
    code?: string | undefined;
    text?: string | undefined;
  }
>;
export declare const TraceEvent: z.ZodObject<
  {
    id: z.ZodString;
    sessionId: z.ZodString;
    timestamp: z.ZodString;
    type: z.ZodString;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: string;
    id: string;
    sessionId: string;
    timestamp: string;
    payload?: Record<string, any> | undefined;
  },
  {
    type: string;
    id: string;
    sessionId: string;
    timestamp: string;
    payload?: Record<string, any> | undefined;
  }
>;
export declare const EvaluationResult: z.ZodObject<
  {
    id: z.ZodString;
    sessionId: z.ZodString;
    questionId: z.ZodOptional<z.ZodString>;
    score: z.ZodNumber;
    summary: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodAny>;
    evaluatedAt: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    sessionId: string;
    score: number;
    evaluatedAt: string;
    questionId?: string | undefined;
    summary?: string | undefined;
    details?: any;
  },
  {
    id: string;
    sessionId: string;
    score: number;
    evaluatedAt: string;
    questionId?: string | undefined;
    summary?: string | undefined;
    details?: any;
  }
>;
export declare const StrategyUpdate: z.ZodObject<
  {
    id: z.ZodString;
    sessionId: z.ZodString;
    changes: z.ZodRecord<z.ZodString, z.ZodAny>;
    updatedAt: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    sessionId: string;
    changes: Record<string, any>;
    updatedAt: string;
  },
  {
    id: string;
    sessionId: string;
    changes: Record<string, any>;
    updatedAt: string;
  }
>;
export declare const InterviewSession: z.ZodObject<
  {
    id: z.ZodString;
    userId: z.ZodString;
    startedAt: z.ZodString;
    endedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<['pending', 'in_progress', 'completed', 'abandoned']>;
    questions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            title: z.ZodString;
            body: z.ZodString;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
            difficulty: z.ZodDefault<z.ZodEnum<['easy', 'medium', 'hard']>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            id: string;
            title: string;
            body: string;
            difficulty: 'easy' | 'medium' | 'hard';
            tags?: string[] | undefined;
          },
          {
            id: string;
            title: string;
            body: string;
            tags?: string[] | undefined;
            difficulty?: 'easy' | 'medium' | 'hard' | undefined;
          }
        >,
        'many'
      >
    >;
    trace: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            sessionId: z.ZodString;
            timestamp: z.ZodString;
            type: z.ZodString;
            payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: string;
            id: string;
            sessionId: string;
            timestamp: string;
            payload?: Record<string, any> | undefined;
          },
          {
            type: string;
            id: string;
            sessionId: string;
            timestamp: string;
            payload?: Record<string, any> | undefined;
          }
        >,
        'many'
      >
    >;
    results: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            sessionId: z.ZodString;
            questionId: z.ZodOptional<z.ZodString>;
            score: z.ZodNumber;
            summary: z.ZodOptional<z.ZodString>;
            details: z.ZodOptional<z.ZodAny>;
            evaluatedAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            id: string;
            sessionId: string;
            score: number;
            evaluatedAt: string;
            questionId?: string | undefined;
            summary?: string | undefined;
            details?: any;
          },
          {
            id: string;
            sessionId: string;
            score: number;
            evaluatedAt: string;
            questionId?: string | undefined;
            summary?: string | undefined;
            details?: any;
          }
        >,
        'many'
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
    userId: string;
    id: string;
    startedAt: string;
    endedAt?: string | null | undefined;
    questions?:
      | {
          id: string;
          title: string;
          body: string;
          difficulty: 'easy' | 'medium' | 'hard';
          tags?: string[] | undefined;
        }[]
      | undefined;
    trace?:
      | {
          type: string;
          id: string;
          sessionId: string;
          timestamp: string;
          payload?: Record<string, any> | undefined;
        }[]
      | undefined;
    results?:
      | {
          id: string;
          sessionId: string;
          score: number;
          evaluatedAt: string;
          questionId?: string | undefined;
          summary?: string | undefined;
          details?: any;
        }[]
      | undefined;
  },
  {
    status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
    userId: string;
    id: string;
    startedAt: string;
    endedAt?: string | null | undefined;
    questions?:
      | {
          id: string;
          title: string;
          body: string;
          tags?: string[] | undefined;
          difficulty?: 'easy' | 'medium' | 'hard' | undefined;
        }[]
      | undefined;
    trace?:
      | {
          type: string;
          id: string;
          sessionId: string;
          timestamp: string;
          payload?: Record<string, any> | undefined;
        }[]
      | undefined;
    results?:
      | {
          id: string;
          sessionId: string;
          score: number;
          evaluatedAt: string;
          questionId?: string | undefined;
          summary?: string | undefined;
          details?: any;
        }[]
      | undefined;
  }
>;
export type SystemPromptVersion = z.infer<typeof SystemPromptVersion>;
export type UserSettings = z.infer<typeof UserSettings>;
export type Question = z.infer<typeof Question>;
export type Answer = z.infer<typeof Answer>;
export type TraceEvent = z.infer<typeof TraceEvent>;
export type EvaluationResult = z.infer<typeof EvaluationResult>;
export type StrategyUpdate = z.infer<typeof StrategyUpdate>;
export type InterviewSession = z.infer<typeof InterviewSession>;
export declare const Schemas: {
  SystemPromptVersion: z.ZodObject<
    {
      version: z.ZodString;
      notes: z.ZodOptional<z.ZodString>;
    },
    'strip',
    z.ZodTypeAny,
    {
      version: string;
      notes?: string | undefined;
    },
    {
      version: string;
      notes?: string | undefined;
    }
  >;
  UserSettings: z.ZodObject<
    {
      userId: z.ZodString;
      preferredDifficulty: z.ZodDefault<z.ZodEnum<['easy', 'medium', 'hard']>>;
      notifyOnReview: z.ZodDefault<z.ZodBoolean>;
    },
    'strip',
    z.ZodTypeAny,
    {
      userId: string;
      preferredDifficulty: 'easy' | 'medium' | 'hard';
      notifyOnReview: boolean;
    },
    {
      userId: string;
      preferredDifficulty?: 'easy' | 'medium' | 'hard' | undefined;
      notifyOnReview?: boolean | undefined;
    }
  >;
  Question: z.ZodObject<
    {
      id: z.ZodString;
      title: z.ZodString;
      body: z.ZodString;
      tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
      difficulty: z.ZodDefault<z.ZodEnum<['easy', 'medium', 'hard']>>;
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string;
      title: string;
      body: string;
      difficulty: 'easy' | 'medium' | 'hard';
      tags?: string[] | undefined;
    },
    {
      id: string;
      title: string;
      body: string;
      tags?: string[] | undefined;
      difficulty?: 'easy' | 'medium' | 'hard' | undefined;
    }
  >;
  Answer: z.ZodObject<
    {
      id: z.ZodString;
      questionId: z.ZodString;
      authorId: z.ZodString;
      code: z.ZodOptional<z.ZodString>;
      text: z.ZodOptional<z.ZodString>;
      submittedAt: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string;
      questionId: string;
      authorId: string;
      submittedAt: string;
      code?: string | undefined;
      text?: string | undefined;
    },
    {
      id: string;
      questionId: string;
      authorId: string;
      submittedAt: string;
      code?: string | undefined;
      text?: string | undefined;
    }
  >;
  TraceEvent: z.ZodObject<
    {
      id: z.ZodString;
      sessionId: z.ZodString;
      timestamp: z.ZodString;
      type: z.ZodString;
      payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    },
    'strip',
    z.ZodTypeAny,
    {
      type: string;
      id: string;
      sessionId: string;
      timestamp: string;
      payload?: Record<string, any> | undefined;
    },
    {
      type: string;
      id: string;
      sessionId: string;
      timestamp: string;
      payload?: Record<string, any> | undefined;
    }
  >;
  EvaluationResult: z.ZodObject<
    {
      id: z.ZodString;
      sessionId: z.ZodString;
      questionId: z.ZodOptional<z.ZodString>;
      score: z.ZodNumber;
      summary: z.ZodOptional<z.ZodString>;
      details: z.ZodOptional<z.ZodAny>;
      evaluatedAt: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string;
      sessionId: string;
      score: number;
      evaluatedAt: string;
      questionId?: string | undefined;
      summary?: string | undefined;
      details?: any;
    },
    {
      id: string;
      sessionId: string;
      score: number;
      evaluatedAt: string;
      questionId?: string | undefined;
      summary?: string | undefined;
      details?: any;
    }
  >;
  StrategyUpdate: z.ZodObject<
    {
      id: z.ZodString;
      sessionId: z.ZodString;
      changes: z.ZodRecord<z.ZodString, z.ZodAny>;
      updatedAt: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string;
      sessionId: string;
      changes: Record<string, any>;
      updatedAt: string;
    },
    {
      id: string;
      sessionId: string;
      changes: Record<string, any>;
      updatedAt: string;
    }
  >;
  InterviewSession: z.ZodObject<
    {
      id: z.ZodString;
      userId: z.ZodString;
      startedAt: z.ZodString;
      endedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      status: z.ZodEnum<['pending', 'in_progress', 'completed', 'abandoned']>;
      questions: z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              id: z.ZodString;
              title: z.ZodString;
              body: z.ZodString;
              tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
              difficulty: z.ZodDefault<z.ZodEnum<['easy', 'medium', 'hard']>>;
            },
            'strip',
            z.ZodTypeAny,
            {
              id: string;
              title: string;
              body: string;
              difficulty: 'easy' | 'medium' | 'hard';
              tags?: string[] | undefined;
            },
            {
              id: string;
              title: string;
              body: string;
              tags?: string[] | undefined;
              difficulty?: 'easy' | 'medium' | 'hard' | undefined;
            }
          >,
          'many'
        >
      >;
      trace: z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              id: z.ZodString;
              sessionId: z.ZodString;
              timestamp: z.ZodString;
              type: z.ZodString;
              payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            },
            'strip',
            z.ZodTypeAny,
            {
              type: string;
              id: string;
              sessionId: string;
              timestamp: string;
              payload?: Record<string, any> | undefined;
            },
            {
              type: string;
              id: string;
              sessionId: string;
              timestamp: string;
              payload?: Record<string, any> | undefined;
            }
          >,
          'many'
        >
      >;
      results: z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              id: z.ZodString;
              sessionId: z.ZodString;
              questionId: z.ZodOptional<z.ZodString>;
              score: z.ZodNumber;
              summary: z.ZodOptional<z.ZodString>;
              details: z.ZodOptional<z.ZodAny>;
              evaluatedAt: z.ZodString;
            },
            'strip',
            z.ZodTypeAny,
            {
              id: string;
              sessionId: string;
              score: number;
              evaluatedAt: string;
              questionId?: string | undefined;
              summary?: string | undefined;
              details?: any;
            },
            {
              id: string;
              sessionId: string;
              score: number;
              evaluatedAt: string;
              questionId?: string | undefined;
              summary?: string | undefined;
              details?: any;
            }
          >,
          'many'
        >
      >;
    },
    'strip',
    z.ZodTypeAny,
    {
      status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
      userId: string;
      id: string;
      startedAt: string;
      endedAt?: string | null | undefined;
      questions?:
        | {
            id: string;
            title: string;
            body: string;
            difficulty: 'easy' | 'medium' | 'hard';
            tags?: string[] | undefined;
          }[]
        | undefined;
      trace?:
        | {
            type: string;
            id: string;
            sessionId: string;
            timestamp: string;
            payload?: Record<string, any> | undefined;
          }[]
        | undefined;
      results?:
        | {
            id: string;
            sessionId: string;
            score: number;
            evaluatedAt: string;
            questionId?: string | undefined;
            summary?: string | undefined;
            details?: any;
          }[]
        | undefined;
    },
    {
      status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
      userId: string;
      id: string;
      startedAt: string;
      endedAt?: string | null | undefined;
      questions?:
        | {
            id: string;
            title: string;
            body: string;
            tags?: string[] | undefined;
            difficulty?: 'easy' | 'medium' | 'hard' | undefined;
          }[]
        | undefined;
      trace?:
        | {
            type: string;
            id: string;
            sessionId: string;
            timestamp: string;
            payload?: Record<string, any> | undefined;
          }[]
        | undefined;
      results?:
        | {
            id: string;
            sessionId: string;
            score: number;
            evaluatedAt: string;
            questionId?: string | undefined;
            summary?: string | undefined;
            details?: any;
          }[]
        | undefined;
    }
  >;
};
