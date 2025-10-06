export const testData = [
  {
    id: 'test_001',
    title: 'Advanced Algorithms Final',
    description: 'Comprehensive test covering dynamic programming, graph algorithms, and optimization techniques.',
    language: 'Python',
    batch: '2022-2026',
    startTime: '2024-09-25 14:00',
    endTime: '2024-09-25 16:00',
    duration: 120,
    status: 'live',
    totalStudents: 45,
    completedStudents: 12,
    inProgressStudents: 28,
    notStartedStudents: 5,
    averageScore: 78.5,
    averageWPM: 42,
    averageErrors: 3.2,
    similarityAlerts: 3
  },
  {
    id: 'test_002',
    title: 'Data Structures Midterm',
    description: 'Testing knowledge of trees, graphs, heaps, and hash tables with practical implementations.',
    language: 'Java',
    batch: '2023-2027',
    startTime: '2024-09-25 16:00',
    endTime: '2024-09-25 17:30',
    duration: 90,
    status: 'upcoming',
    totalStudents: 52,
    completedStudents: 0,
    inProgressStudents: 0,
    notStartedStudents: 52,
    averageScore: 0,
    averageWPM: 0,
    averageErrors: 0,
    similarityAlerts: 0
  },
  {
    id: 'test_003',
    title: 'Python Fundamentals Quiz',
    description: 'Basic Python programming concepts including functions, loops, and data structures.',
    language: 'Python',
    batch: '2024-2028',
    startTime: '2024-09-24 10:00',
    endTime: '2024-09-24 11:00',
    duration: 60,
    status: 'completed',
    totalStudents: 38,
    completedStudents: 36,
    inProgressStudents: 0,
    notStartedStudents: 2,
    averageScore: 85.2,
    averageWPM: 38,
    averageErrors: 2.1,
    similarityAlerts: 1
  },
  {
    id: 'test_004',
    title: 'Machine Learning Basics',
    description: 'Introduction to ML algorithms, data preprocessing, and model evaluation.',
    language: 'Python',
    batch: '2022-2026',
    startTime: '2024-09-26 09:00',
    endTime: '2024-09-26 10:30',
    duration: 90,
    status: 'upcoming',
    totalStudents: 42,
    completedStudents: 0,
    inProgressStudents: 0,
    notStartedStudents: 42,
    averageScore: 0,
    averageWPM: 0,
    averageErrors: 0,
    similarityAlerts: 0
  }
]

export const studentData = [
  // Test 001 Students
  {
    id: 'student_001',
    name: 'Sarah Chen',
    pin: '2022001',
    testId: 'test_001',
    status: 'completed',
    startTime: '14:05',
    endTime: '15:22',
    duration: 77,
    progress: 100,
    errors: 2,
    wpm: 52,
    similarity: 15,
    lastActive: 'Completed',
    submissions: 3,
    failedRuns: 1,
    currentCode: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)`,
    submissionHistory: [
      {
        timestamp: '14:15',
        code: 'def fibonacci(n):\n    # Initial attempt\n    pass',
        status: 'error',
        errors: ['SyntaxError: unexpected EOF while parsing']
      },
      {
        timestamp: '14:45',
        code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
        status: 'partial',
        errors: []
      },
      {
        timestamp: '15:22',
        code: 'Complete solution with all algorithms',
        status: 'success',
        errors: []
      }
    ],
    typingSpeedHistory: [
      { time: '14:05', wpm: 35 },
      { time: '14:15', wpm: 42 },
      { time: '14:25', wpm: 48 },
      { time: '14:35', wpm: 52 },
      { time: '14:45', wpm: 55 },
      { time: '14:55', wpm: 51 },
      { time: '15:05', wpm: 48 },
      { time: '15:15', wpm: 52 }
    ]
  },
  {
    id: 'student_002',
    name: 'Michael Zhang',
    pin: '2022002',
    testId: 'test_001',
    status: 'completed',
    startTime: '14:03',
    endTime: '15:08',
    duration: 65,
    progress: 100,
    errors: 1,
    wpm: 48,
    similarity: 12,
    lastActive: 'Completed',
    submissions: 2,
    failedRuns: 0,
    currentCode: `import heapq

def dijkstra(graph, start):
    distances = {node: float('infinity') for node in graph}
    distances[start] = 0
    pq = [(0, start)]
    
    while pq:
        current_distance, current = heapq.heappop(pq)
        if current_distance > distances[current]:
            continue
            
        for neighbor, weight in graph[current].items():
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(pq, (distance, neighbor))
    
    return distances`,
    submissionHistory: [
      {
        timestamp: '14:35',
        code: 'Basic graph traversal implementation',
        status: 'partial',
        errors: ['IndexError: list index out of range']
      },
      {
        timestamp: '15:08',
        code: 'Complete Dijkstra algorithm implementation',
        status: 'success',
        errors: []
      }
    ],
    typingSpeedHistory: [
      { time: '14:03', wpm: 45 },
      { time: '14:13', wpm: 47 },
      { time: '14:23', wpm: 49 },
      { time: '14:33', wpm: 51 },
      { time: '14:43', wpm: 48 },
      { time: '14:53', wpm: 46 },
      { time: '15:03', wpm: 48 }
    ]
  },
  {
    id: 'student_003',
    name: 'Emma Rodriguez',
    pin: '2022003',
    testId: 'test_001',
    status: 'in-progress',
    startTime: '14:02',
    endTime: null,
    duration: null,
    progress: 75,
    errors: 4,
    wpm: 39,
    similarity: 22,
    lastActive: '2 min ago',
    submissions: 5,
    failedRuns: 3,
    currentCode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1

# Still working on dynamic programming solution...
def knapsack(weights, values, capacity):
    # TODO: Implement this
    pass`,
    submissionHistory: [
      {
        timestamp: '14:12',
        code: 'Initial binary search attempt',
        status: 'error',
        errors: ['NameError: name arr is not defined']
      },
      {
        timestamp: '14:25',
        code: 'Fixed binary search implementation',
        status: 'success',
        errors: []
      }
    ],
    typingSpeedHistory: [
      { time: '14:02', wpm: 32 },
      { time: '14:12', wpm: 35 },
      { time: '14:22', wpm: 38 },
      { time: '14:32', wpm: 41 },
      { time: '14:42', wpm: 39 },
      { time: '14:52', wpm: 37 }
    ]
  },
  {
    id: 'student_004',
    name: 'James Wilson',
    pin: '2022004',
    testId: 'test_001',
    status: 'in-progress',
    startTime: '14:00',
    endTime: null,
    duration: null,
    progress: 60,
    errors: 8,
    wpm: 25,
    similarity: 85,
    lastActive: 'now',
    submissions: 7,
    failedRuns: 6,
    currentCode: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)`,
    submissionHistory: [
      {
        timestamp: '14:10',
        code: 'Copied fibonacci solution',
        status: 'error',
        errors: ['RecursionError: maximum recursion depth exceeded']
      }
    ],
    typingSpeedHistory: [
      { time: '14:00', wpm: 20 },
      { time: '14:10', wpm: 22 },
      { time: '14:20', wpm: 25 },
      { time: '14:30', wpm: 27 },
      { time: '14:40', wpm: 25 },
      { time: '14:50', wpm: 23 }
    ]
  },
  {
    id: 'student_005',
    name: 'Aisha Patel',
    pin: '2022005',
    testId: 'test_001',
    status: 'in-progress',
    startTime: '14:08',
    endTime: null,
    duration: null,
    progress: 45,
    errors: 3,
    wpm: 44,
    similarity: 8,
    lastActive: '30 sec ago',
    submissions: 3,
    failedRuns: 1,
    currentCode: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
    submissionHistory: [
      {
        timestamp: '14:18',
        code: 'Basic merge sort structure',
        status: 'partial',
        errors: []
      },
      {
        timestamp: '14:35',
        code: 'Complete merge sort implementation',
        status: 'success',
        errors: []
      }
    ],
    typingSpeedHistory: [
      { time: '14:08', wpm: 40 },
      { time: '14:18', wpm: 43 },
      { time: '14:28', wpm: 46 },
      { time: '14:38', wpm: 44 },
      { time: '14:48', wpm: 42 }
    ]
  },
  {
    id: 'student_006',
    name: 'David Kim',
    pin: '2022006',
    testId: 'test_001',
    status: 'locked',
    startTime: '14:15',
    endTime: '14:45',
    duration: 30,
    progress: 25,
    errors: 12,
    wpm: 18,
    similarity: 95,
    lastActive: 'Locked at 14:45',
    submissions: 8,
    failedRuns: 7,
    currentCode: `# Attempting to copy solutions
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# This looks suspicious - identical to another student's code`,
    submissionHistory: [
      {
        timestamp: '14:20',
        code: 'Suspicious identical code pattern',
        status: 'error',
        errors: ['Multiple syntax errors']
      }
    ],
    typingSpeedHistory: [
      { time: '14:15', wpm: 15 },
      { time: '14:25', wpm: 18 },
      { time: '14:35', wpm: 20 },
      { time: '14:45', wpm: 18 }
    ]
  },

  // Test 003 Students (Python Fundamentals - Completed)
  {
    id: 'student_007',
    name: 'Lisa Anderson',
    pin: '2024001',
    testId: 'test_003',
    status: 'completed',
    startTime: '10:02',
    endTime: '10:45',
    duration: 43,
    progress: 100,
    errors: 1,
    wpm: 41,
    similarity: 5,
    lastActive: 'Completed',
    submissions: 2,
    failedRuns: 0,
    currentCode: `def calculate_grade(score):
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    else:
        return 'F'

def find_max_in_list(numbers):
    if not numbers:
        return None
    
    max_num = numbers[0]
    for num in numbers[1:]:
        if num > max_num:
            max_num = num
    return max_num`,
    submissionHistory: [
      {
        timestamp: '10:25',
        code: 'Basic function implementations',
        status: 'partial',
        errors: []
      },
      {
        timestamp: '10:45',
        code: 'Complete solution with all functions',
        status: 'success',
        errors: []
      }
    ],
    typingSpeedHistory: [
      { time: '10:02', wpm: 38 },
      { time: '10:12', wpm: 40 },
      { time: '10:22', wpm: 42 },
      { time: '10:32', wpm: 41 },
      { time: '10:42', wpm: 40 }
    ]
  },
  {
    id: 'student_008',
    name: 'Robert Johnson',
    pin: '2024002',
    testId: 'test_003',
    status: 'completed',
    startTime: '10:01',
    endTime: '10:38',
    duration: 37,
    progress: 100,
    errors: 0,
    wpm: 45,
    similarity: 3,
    lastActive: 'Completed',
    submissions: 1,
    failedRuns: 0,
    currentCode: `def factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True

def reverse_string(s):
    return s[::-1]`,
    submissionHistory: [
      {
        timestamp: '10:38',
        code: 'Perfect solution on first try',
        status: 'success',
        errors: []
      }
    ],
    typingSpeedHistory: [
      { time: '10:01', wpm: 43 },
      { time: '10:11', wpm: 45 },
      { time: '10:21', wpm: 47 },
      { time: '10:31', wpm: 45 }
    ]
  }
]

export const getTestById = (id) => {
  return testData.find(test => test.id === id)
}

export const getStudentById = (id) => {
  return studentData.find(student => student.id === id)
}

export const getStudentsByTestId = (testId) => {
  return studentData.filter(student => student.testId === testId)
}

export const getAllTests = () => {
  return testData
}

export const getAllStudents = () => {
  return studentData
}

export const getTestsByStatus = (status) => {
  return testData.filter(test => test.status === status)
}

export const getStudentsByStatus = (status) => {
  return studentData.filter(student => student.status === status)
}

export const getHighSimilarityStudents = (threshold = 80) => {
  return studentData.filter(student => student.similarity >= threshold)
}

export const getTestStats = (testId) => {
  try {
    const test = getTestById(testId)
    const students = getStudentsByTestId(testId)
    
    if (!test) {
      console.warn(`Test with ID ${testId} not found`)
      return null
    }
    
    const completedStudents = students.filter(s => s.status === 'completed')
    const inProgressStudents = students.filter(s => s.status === 'in-progress')
    const lockedStudents = students.filter(s => s.status === 'locked')
    
    const actualAverageWPM = completedStudents.length > 0 
      ? Math.round(completedStudents.reduce((sum, s) => sum + (s.wpm || 0), 0) / completedStudents.length * 10) / 10
      : 0
      
    const actualAverageErrors = completedStudents.length > 0
      ? Math.round(completedStudents.reduce((sum, s) => sum + (s.errors || 0), 0) / completedStudents.length * 10) / 10
      : 0
    
    return {
      ...test,
      actualCompletedStudents: completedStudents.length,
      actualInProgressStudents: inProgressStudents.length,
      actualLockedStudents: lockedStudents.length,
      actualAverageWPM,
      actualAverageErrors,
      highSimilarityCount: students.filter(s => s.similarity >= 80).length,
      totalActualStudents: students.length
    }
  } catch (error) {
    console.error(`Error calculating test stats for ${testId}:`, error)
    return null
  }
}
