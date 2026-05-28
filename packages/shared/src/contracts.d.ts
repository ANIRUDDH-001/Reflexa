import { z } from 'zod';
export declare const HealthResponse: z.ZodObject<
  {
    status: z.ZodLiteral<'ok'>;
    ts: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'ok';
    ts: string;
  },
  {
    status: 'ok';
    ts: string;
  }
>;
export declare const CreateSessionRequest: z.ZodObject<
  {
    userId: z.ZodString;
    settings: z.ZodOptional<z.ZodAny>;
  },
  'strip',
  z.ZodTypeAny,
  {
    userId: string;
    settings?: any;
  },
  {
    userId: string;
    settings?: any;
  }
>;
export declare const CreateSessionResponse: z.ZodObject<
  {
    session: z.ZodObject<
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
  },
  'strip',
  z.ZodTypeAny,
  {
    session: {
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
    };
  },
  {
    session: {
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
    };
  }
>;
export declare const GetSessionResponse: z.ZodObject<
  {
    session: z.ZodObject<
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
  },
  'strip',
  z.ZodTypeAny,
  {
    session: {
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
    };
  },
  {
    session: {
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
    };
  }
>;
export declare const SubmitAnswerRequest: z.ZodObject<
  {
    sessionId: z.ZodString;
    answer: z.ZodObject<
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
  },
  'strip',
  z.ZodTypeAny,
  {
    sessionId: string;
    answer: {
      id: string;
      questionId: string;
      authorId: string;
      submittedAt: string;
      code?: string | undefined;
      text?: string | undefined;
    };
  },
  {
    sessionId: string;
    answer: {
      id: string;
      questionId: string;
      authorId: string;
      submittedAt: string;
      code?: string | undefined;
      text?: string | undefined;
    };
  }
>;
export declare const SubmitAnswerResponse: z.ZodObject<
  {
    evaluation: z.ZodObject<
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
  },
  'strip',
  z.ZodTypeAny,
  {
    evaluation: {
      id: string;
      sessionId: string;
      score: number;
      evaluatedAt: string;
      questionId?: string | undefined;
      summary?: string | undefined;
      details?: any;
    };
  },
  {
    evaluation: {
      id: string;
      sessionId: string;
      score: number;
      evaluatedAt: string;
      questionId?: string | undefined;
      summary?: string | undefined;
      details?: any;
    };
  }
>;
export declare const APIContracts: {
  HealthResponse: z.ZodObject<
    {
      status: z.ZodLiteral<'ok'>;
      ts: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
      status: 'ok';
      ts: string;
    },
    {
      status: 'ok';
      ts: string;
    }
  >;
  CreateSessionRequest: z.ZodObject<
    {
      userId: z.ZodString;
      settings: z.ZodOptional<z.ZodAny>;
    },
    'strip',
    z.ZodTypeAny,
    {
      userId: string;
      settings?: any;
    },
    {
      userId: string;
      settings?: any;
    }
  >;
  CreateSessionResponse: z.ZodObject<
    {
      session: z.ZodObject<
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
    },
    'strip',
    z.ZodTypeAny,
    {
      session: {
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
      };
    },
    {
      session: {
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
      };
    }
  >;
  GetSessionResponse: z.ZodObject<
    {
      session: z.ZodObject<
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
    },
    'strip',
    z.ZodTypeAny,
    {
      session: {
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
      };
    },
    {
      session: {
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
      };
    }
  >;
  SubmitAnswerRequest: z.ZodObject<
    {
      sessionId: z.ZodString;
      answer: z.ZodObject<
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
    },
    'strip',
    z.ZodTypeAny,
    {
      sessionId: string;
      answer: {
        id: string;
        questionId: string;
        authorId: string;
        submittedAt: string;
        code?: string | undefined;
        text?: string | undefined;
      };
    },
    {
      sessionId: string;
      answer: {
        id: string;
        questionId: string;
        authorId: string;
        submittedAt: string;
        code?: string | undefined;
        text?: string | undefined;
      };
    }
  >;
  SubmitAnswerResponse: z.ZodObject<
    {
      evaluation: z.ZodObject<
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
    },
    'strip',
    z.ZodTypeAny,
    {
      evaluation: {
        id: string;
        sessionId: string;
        score: number;
        evaluatedAt: string;
        questionId?: string | undefined;
        summary?: string | undefined;
        details?: any;
      };
    },
    {
      evaluation: {
        id: string;
        sessionId: string;
        score: number;
        evaluatedAt: string;
        questionId?: string | undefined;
        summary?: string | undefined;
        details?: any;
      };
    }
  >;
};
