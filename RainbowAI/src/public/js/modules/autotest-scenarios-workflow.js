/**
 * @fileoverview Multi-turn workflow, conversation, and sentiment test scenarios
 * @module autotest-scenarios-workflow
 */

// Multi-turn scenarios: Full Workflows, Conversation Summarization, Sentiment Analysis

export const WORKFLOW_SCENARIOS = [
  // ══════════════════════════════════════════════════════════════
  // WORKFLOW_COMPLETE (7 tests) - Full multi-turn workflow tests
  // ══════════════════════════════════════════════════════════════
  {
    id: 'workflow-booking-payment-full',
    name: 'Workflow - Complete Booking & Payment (6 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'I want to make a booking' },
      { text: '2 guests' },
      { text: 'Check-in 15 Feb, check-out 17 Feb' },
      { text: 'I have already paid' },
      { text: 'Here is my payment receipt [image]' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['booking', 'help', 'guests'], critical: true }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['date', 'check-in', 'check-out'], critical: true }
        ]
      },
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['payment', 'receipt', 'paid'], critical: false }
        ]
      },
      {
        turn: 4, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['admin', 'forward', 'sent', '127088789', 'received', 'confirm', 'receipt', 'booking'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'workflow-checkin-full',
    name: 'Workflow - Complete Check-in Process (10 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'I want to check in' },
      { text: 'I have already arrived' },
      { text: 'My name is John Smith' },
      { text: '[Passport photo uploaded]' },
      { text: 'Check-in today, 12 Feb 2026' },
      { text: 'Check-out 15 Feb 2026' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['check-in', 'process', 'arrived'], critical: true }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['name', 'passport', 'IC'], critical: true }
        ]
      },
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['photo', 'upload', 'passport'], critical: true }
        ]
      },
      {
        turn: 3, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['check-in', 'date'], critical: true }
        ]
      },
      {
        turn: 5, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['available', 'capsule', 'admin', 'forward'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'workflow-lower-deck-full',
    name: 'Workflow - Lower Deck Preference (3 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'I prefer a lower deck capsule' },
      { text: 'Yes, I would like to proceed with booking' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['lower', 'deck', 'check', 'even'], critical: true }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'not_contains', values: ['error', 'undefined'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'workflow-complaint-full',
    name: 'Workflow - Complaint Resolution (5 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'I have a complaint about my room' },
      { text: 'The room is very noisy and the air conditioning is not working' },
      { text: '[Photo of the broken AC unit]' },
      { text: 'No, that is all for now' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['apologize', 'sorry', 'issue', 'describe'], critical: true }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['photo', 'share', 'image'], critical: false }
        ]
      },
      {
        turn: 3, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['priority', 'management', 'staff', '127088789'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'workflow-theft-emergency-full',
    name: 'Workflow - Theft Emergency (6 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'Help! My phone was stolen!' },
      { text: 'My iPhone 15 Pro and wallet were stolen' },
      { text: 'I noticed it about 30 minutes ago' },
      { text: 'It happened in the common area' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['sorry', 'theft', 'security', 'priority', 'item'], critical: true }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['when', 'notice', 'time'], critical: true }
        ]
      },
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['where', 'occur', 'location'], critical: true }
        ]
      },
      {
        turn: 3, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['URGENT', 'staff', 'notif', 'CCTV', 'police'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'workflow-card-locked-full',
    name: 'Workflow - Card Locked in Capsule (4 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'Help! My card is locked inside my capsule!' },
      { text: 'I cannot see any emergency release button' },
      { text: 'I need help now please!' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['worry', 'solve', 'guide', 'emergency'], critical: true }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['contact', 'staff', 'notif'], critical: true }
        ]
      },
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['staff', 'master', 'arrive', 'calm', 'safe'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'workflow-tourist-guide-full',
    name: 'Workflow - Tourist Guide Request (2 turns)',
    category: 'WORKFLOW_COMPLETE',
    messages: [
      { text: 'What tourist attractions are nearby?' },
      { text: 'Can you give me directions to LEGOLAND?' }
    ],
    validate: [
      {
        turn: 0, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['LEGOLAND', 'Desaru', 'Sultan', 'attractions', 'tourist'], critical: true },
          { type: 'contains_any', values: ['recommend', 'direction'], critical: false }
        ]
      },
      {
        turn: 1, rules: [
          { type: 'not_empty', critical: true },
          { type: 'not_contains', values: ['error', 'undefined'], critical: true }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // MULTI_TURN_INTENT (6 tests) - Intent classification per turn
  // Tests that intent is correctly classified at each turn in
  // a sequential multi-turn conversation.
  // ══════════════════════════════════════════════════════════════
  {
    id: 'mt-noise-followup',
    name: 'Multi-Turn - Noise complaint follow-up',
    category: 'MULTI_TURN_INTENT',
    messages: [
      { text: 'The people next door are being really loud' },
      { text: 'It has been going on for over an hour now' },
      { text: 'Can someone come and tell them to quiet down?' }
    ],
    validate: [
      { turn: 0, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['sorry', 'noise', 'quiet', 'staff', 'relocate'], critical: true }
      ]},
      { turn: 1, rules: [
        { type: 'not_empty', critical: true }
      ]},
      { turn: 2, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['staff', 'send', 'address', 'quiet', 'sorry'], critical: true }
      ]}
    ]
  },
  {
    id: 'mt-booking-full-flow',
    name: 'Multi-Turn - Booking full conversation flow',
    category: 'MULTI_TURN_INTENT',
    messages: [
      { text: 'How much is a capsule per night?' },
      { text: 'Do you have availability next weekend?' },
      { text: 'Great, I would like to book a room please' },
      { text: 'How can I pay?' }
    ],
    validate: [
      { turn: 0, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['RM', 'price', 'night', 'rate'], critical: true }
      ]},
      { turn: 1, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['available', 'check', 'book'], critical: true }
      ]},
      { turn: 2, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['book', 'reservation', 'WhatsApp', 'guest'], critical: true }
      ]},
      { turn: 3, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['cash', 'card', 'transfer', 'bank', 'payment'], critical: true }
      ]}
    ]
  },
  {
    id: 'mt-complaint-escalation',
    name: 'Multi-Turn - Complaint escalation path',
    category: 'MULTI_TURN_INTENT',
    messages: [
      { text: 'My room is not clean' },
      { text: 'Nobody came to fix it after I reported it' },
      { text: 'This is unacceptable! I want to speak to a manager!' }
    ],
    validate: [
      { turn: 0, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['sorry', 'clean', 'housekeeping'], critical: true }
      ]},
      { turn: 1, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['sorry', 'apologize', 'staff'], critical: true }
      ]},
      { turn: 2, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['manager', 'staff', 'sorry', 'escalat', 'contact'], critical: true }
      ]}
    ]
  },
  {
    id: 'mt-checkin-flow',
    name: 'Multi-Turn - Check-in information flow',
    category: 'MULTI_TURN_INTENT',
    messages: [
      { text: 'What time is check-in?' },
      { text: 'I have arrived at the hostel now' },
      { text: 'Can I get a lower deck capsule?' },
      { text: 'What is the WiFi password?' }
    ],
    validate: [
      { turn: 0, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['2', '3', 'PM', 'check-in', 'afternoon'], critical: true }
      ]},
      { turn: 1, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['welcome', 'check-in', 'name', 'information'], critical: true }
      ]},
      { turn: 2, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['lower', 'deck', 'even', 'C2', 'C4'], critical: true }
      ]},
      { turn: 3, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['WiFi', 'wifi', 'password', 'network'], critical: true }
      ]}
    ]
  },
  {
    id: 'mt-billing-dispute',
    name: 'Multi-Turn - Billing dispute',
    category: 'MULTI_TURN_INTENT',
    messages: [
      { text: 'I want to check my bill' },
      { text: 'There is an extra charge of RM50 I did not authorize' },
      { text: 'I was overcharged and I want a refund' }
    ],
    validate: [
      { turn: 0, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['bill', 'charge', 'review'], critical: true }
      ]},
      { turn: 1, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['review', 'investigate', 'charge', 'refund'], critical: true }
      ]},
      { turn: 2, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['refund', 'investigation', 'review', 'management'], critical: true }
      ]}
    ]
  },
  {
    id: 'mt-checkout-luggage',
    name: 'Multi-Turn - Checkout then luggage',
    category: 'MULTI_TURN_INTENT',
    messages: [
      { text: 'What time do I need to check out?' },
      { text: 'How do I check out?' },
      { text: 'Can I leave my luggage here after checkout?' }
    ],
    validate: [
      { turn: 0, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['10', '11', '12', 'AM', 'noon', 'check-out'], critical: true }
      ]},
      { turn: 1, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['bill', 'front desk', 'payment', 'key'], critical: true }
      ]},
      { turn: 2, rules: [
        { type: 'not_empty', critical: true },
        { type: 'contains_any', values: ['storage', 'bag', 'luggage'], critical: true }
      ]}
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // CONVERSATION_SUMMARIZATION (4 tests) - Long conversation handling
  // ══════════════════════════════════════════════════════════════
  {
    id: 'conv-long-conversation',
    name: 'Conv - Long Conversation (11+ messages)',
    category: 'CONVERSATION_SUMMARIZATION',
    messages: [
      { text: 'Hi, what are your check-in times?' },
      { text: 'Thanks! And what about breakfast?' },
      { text: 'Do you have parking?' },
      { text: 'How far are you from the beach?' },
      { text: 'Can I book a tour?' },
      { text: 'What facilities do you have?' },
      { text: 'Do you have WiFi?' },
      { text: 'Can I store my luggage?' },
      { text: 'Do you have lockers?' },
      { text: 'What about towels?' },
      { text: 'One more thing - do you have a kitchen?' }
    ],
    validate: [
      { turn: 0, rules: [{ type: 'not_empty', critical: true }] },
      { turn: 5, rules: [{ type: 'not_empty', critical: true }] },
      {
        turn: 10, rules: [
          { type: 'not_empty', critical: true },
          { type: 'response_time', max: 15000, critical: false }
        ]
      }
    ]
  },
  {
    id: 'conv-context-preservation',
    name: 'Conv - Context Preservation After Summarization',
    category: 'CONVERSATION_SUMMARIZATION',
    messages: [
      { text: 'My name is John' },
      { text: 'I want to book for 3 nights' },
      { text: 'Starting June 15th' },
      { text: 'For 2 people' },
      { text: 'What facilities do you have?' },
      { text: 'Do you have parking?' },
      { text: 'How about breakfast?' },
      { text: 'Is WiFi free?' },
      { text: 'Can I check in early?' },
      { text: 'What about late checkout?' },
      { text: 'Do you remember my name?' }
    ],
    validate: [
      {
        turn: 10, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['John'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'conv-coherent-responses',
    name: 'Conv - Coherent Responses in Long Chat',
    category: 'CONVERSATION_SUMMARIZATION',
    messages: [
      { text: 'I need a capsule for tonight' },
      { text: 'Just one person' },
      { text: 'How much is it?' },
      { text: 'Do you have availability?' },
      { text: 'What time can I check in?' },
      { text: 'Is breakfast included?' },
      { text: 'Can I pay by card?' },
      { text: 'Do you have lockers?' },
      { text: 'How about towels?' },
      { text: 'Is there a curfew?' },
      { text: 'Can I extend my stay tomorrow?' }
    ],
    validate: [
      { turn: 0, rules: [{ type: 'not_empty', critical: true }] },
      { turn: 5, rules: [{ type: 'not_empty', critical: true }] },
      {
        turn: 10, rules: [
          { type: 'not_empty', critical: true },
          { type: 'not_contains', values: ['error', 'undefined'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'conv-performance-check',
    name: 'Conv - Performance With Summarization',
    category: 'CONVERSATION_SUMMARIZATION',
    messages: [
      { text: 'Hello' },
      { text: 'What are your prices?' },
      { text: 'Do you have rooms available?' },
      { text: 'Can I book online?' },
      { text: 'How do I get there?' },
      { text: 'What facilities do you offer?' },
      { text: 'Is WiFi free?' },
      { text: 'Do you have parking?' },
      { text: 'Can I cancel my booking?' },
      { text: 'What is your refund policy?' },
      { text: 'Thank you for all the information!' }
    ],
    validate: [
      {
        turn: 10, rules: [
          { type: 'not_empty', critical: true },
          { type: 'response_time', max: 12000, critical: false },
          { type: 'contains_any', values: ['welcome', 'pleasure', 'help'], critical: false }
        ]
      }
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // SENTIMENT_ANALYSIS (4 tests) - Negative sentiment detection & escalation
  // ══════════════════════════════════════════════════════════════
  {
    id: 'sentiment-frustrated-guest',
    name: 'Sentiment - Frustrated Guest (3 negative messages)',
    category: 'SENTIMENT_ANALYSIS',
    messages: [
      { text: 'This is ridiculous! I have been waiting for 30 minutes!' },
      { text: 'Nobody is helping me! This is terrible service!' },
      { text: 'I am extremely disappointed with this place!' }
    ],
    validate: [
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['staff', 'contact', 'manager', 'apologize', 'sorry'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'sentiment-angry-complaint',
    name: 'Sentiment - Angry Complaint Escalation',
    category: 'SENTIMENT_ANALYSIS',
    messages: [
      { text: 'The room is dirty and disgusting!' },
      { text: 'This is unacceptable! I want my money back!' },
      { text: 'I will leave a bad review if this is not fixed immediately!' }
    ],
    validate: [
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['staff', 'manager', 'contact', 'escalate'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'sentiment-consecutive-negative',
    name: 'Sentiment - Consecutive Negative Detection',
    category: 'SENTIMENT_ANALYSIS',
    messages: [
      { text: 'I am not happy with my stay' },
      { text: 'The WiFi is not working at all' },
      { text: 'And the shower is broken too!' },
      { text: 'This is very frustrating!' }
    ],
    validate: [
      {
        turn: 3, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['staff', 'sorry', 'apologize', 'help'], critical: true }
        ]
      }
    ]
  },
  {
    id: 'sentiment-cooldown-period',
    name: 'Sentiment - Escalation Cooldown Check',
    category: 'SENTIMENT_ANALYSIS',
    messages: [
      { text: 'I am very angry about this situation!' },
      { text: 'This is completely unacceptable!' },
      { text: 'I demand to speak to someone now!' },
      { text: 'Wait, after 10 minutes - another issue: the door is broken!' }
    ],
    validate: [
      {
        turn: 2, rules: [
          { type: 'not_empty', critical: true },
          { type: 'contains_any', values: ['staff', 'manager', 'contact', 'escalat', 'sorry', 'team', 'help'], critical: true }
        ]
      }
    ]
  }
];
