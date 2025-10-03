import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  // deleteDoc,
  onSnapshot,
  serverTimestamp,
  // limit,
  // startAfter,
} from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';
// import { v4 as uuidv4 } from 'uuid';

import { db } from '../lib/firebase'; // Import the Firestore instance

export type CourseStatus = 'Draft' | 'Published' | 'Archived';

export interface Course {
  id: string;
  title: string;
  desc?: string;
  coverUrl?: string;
  tags: string[];
  status: CourseStatus;
  ownerUid?: string;
  createdAt?: number;
  updatedAt?: number;
}

const COURSES_COLLECTION = 'courses';

export function useCourses(params: { search?: string; tags?: string[]; status?: 'All' | CourseStatus; pageSize?: number }): {
  items: Course[]; loading: boolean; hasMore: boolean; loadMore: () => void; refresh: () => void;
} {
  const { search, tags, status } = params;
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // To force refresh

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, COURSES_COLLECTION), orderBy('createdAt', 'desc'));

    if (tags && tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', tags));
    }

    if (status && status !== 'All') {
      q = query(q, where('status', '==', status));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedCourses: Course[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[];

      // Client-side filtering for search (Firestore doesn't support full-text search directly)
      let filteredCourses = fetchedCourses;
      if (search) {
        const lowerSearch = search.toLowerCase();
        filteredCourses = fetchedCourses.filter(
          (course) =>
            course.title.toLowerCase().includes(lowerSearch) ||
            course.desc?.toLowerCase().includes(lowerSearch) ||
            course.tags.some((tag) => tag.toLowerCase().includes(lowerSearch))
        );
      }

      setItems(filteredCourses);
      setLoading(false);
      setHasMore(false); // With onSnapshot, we fetch all matching, so no "more" to load in this simplified version
    }, (error) => {
      console.error('Error fetching courses:', error);
      setLoading(false);
      // Handle error appropriately
    });

    // Cleanup function to unsubscribe from real-time updates
    return () => unsubscribe();
  }, [search, tags, status, refreshKey]); // Re-run effect when filters or refreshKey change

  // loadMore is not directly applicable with simple onSnapshot, but keep for interface
  const loadMore = useCallback(() => {
    console.log('Load more not implemented with current onSnapshot setup.');
  }, []);

  return { items, loading, hasMore, loadMore, refresh };
}

export async function createCourse(input: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
  try {
    // Import getAuth to get current user
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const docRef = await addDoc(collection(db, COURSES_COLLECTION), {
      ...input,
      ownerUid: currentUser.uid,  // Set owner to current user
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tags: input.tags || [],
      status: input.status || 'Draft',
    });
    // Return the created course with the Firestore-generated ID and server timestamps
    // Note: serverTimestamp() is an object, so we use Date.now() for immediate client-side display
    return { id: docRef.id, ...input, ownerUid: currentUser.uid, createdAt: Date.now(), updatedAt: Date.now() } as Course;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<void> {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, id);
    await updateDoc(courseRef, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
}

export async function duplicateCourse(id: string): Promise<Course> {
  try {
    const originalDoc = await getDocs(query(collection(db, COURSES_COLLECTION), where('id', '==', id)));
    if (originalDoc.empty) {
      throw new Error('Course not found for duplication');
    }
    const courseToDuplicate = originalDoc.docs[0].data() as Course;

    // Omit id from courseToDuplicate before creating new input
    const { id: _originalId, ...restOfCourse } = courseToDuplicate;
    // _originalId is intentionally unused as we generate a new ID
    const duplicatedCourseInput: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
      ...restOfCourse,
      title: `${courseToDuplicate.title} (Copy)`,
      status: 'Draft', // Duplicated courses start as Draft
    };
    return await createCourse(duplicatedCourseInput);
  } catch (error) {
    console.error('Error duplicating course:', error);
    throw error;
  }
}

export async function setCourseStatus(id: string, status: CourseStatus): Promise<void> {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, id);
    await updateDoc(courseRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting course status:', error);
    throw error;
  }
}

export async function createTemplateCourse(): Promise<Course> {
  try {
    // Import getAuth to get current user
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Create template course
    const templateCourseInput: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
      title: '🚀 Khóa học React.js từ cơ bản đến nâng cao',
      desc: 'Khóa học toàn diện về React.js với các dự án thực tế, từ những khái niệm cơ bản đến các kỹ thuật nâng cao. Học viên sẽ được hướng dẫn từng bước để xây dựng các ứng dụng web hiện đại.',
      coverUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
      tags: ['React', 'JavaScript', 'Frontend', 'Web Development', 'Template'],
      status: 'Published',
      ownerUid: currentUser.uid,
    };

    const course = await createCourse(templateCourseInput);
    
    // Create template modules and lessons
    await createTemplateModulesAndLessons(course.id);
    
    return course;
  } catch (error) {
    console.error('Error creating template course:', error);
    throw error;
  }
}

async function createTemplateModulesAndLessons(courseId: string) {
  try {
    const modules = [
      {
        title: '📚 Chương 1: Giới thiệu về React',
        description: 'Tìm hiểu về React, cách hoạt động và môi trường phát triển',
        order: 1,
        lessons: [
          {
            title: 'React là gì và tại sao nên sử dụng?',
            type: 'text',
            content: `# React là gì?

React là một thư viện JavaScript được phát triển bởi Facebook để xây dựng giao diện người dùng (UI). React giúp bạn tạo ra các ứng dụng web nhanh chóng và dễ bảo trì.

## Tại sao nên sử dụng React?

### 1. **Component-based Architecture**
- Tái sử dụng code dễ dàng
- Dễ bảo trì và mở rộng
- Tách biệt logic và UI

### 2. **Virtual DOM**
- Cải thiện hiệu suất
- Cập nhật UI nhanh chóng
- Tối ưu hóa rendering

### 3. **Ecosystem phong phú**
- Nhiều thư viện hỗ trợ
- Cộng đồng lớn mạnh
- Tài liệu đầy đủ

### 4. **JSX Syntax**
- Viết HTML trong JavaScript
- Code dễ đọc và hiểu
- Hỗ trợ TypeScript

## Khi nào nên sử dụng React?

- Xây dựng Single Page Applications (SPA)
- Ứng dụng có nhiều tương tác người dùng
- Cần hiệu suất cao
- Team có kinh nghiệm JavaScript`,
            order: 1,
          },
          {
            title: 'Cài đặt môi trường phát triển',
            type: 'text',
            content: `# Cài đặt môi trường phát triển React

## Yêu cầu hệ thống

### 1. **Node.js**
- Phiên bản: 16.0 trở lên
- Tải về: [nodejs.org](https://nodejs.org)

### 2. **npm hoặc yarn**
- npm: đi kèm với Node.js
- yarn: cài đặt riêng nếu muốn

### 3. **Code Editor**
- Visual Studio Code (khuyến nghị)
- WebStorm
- Sublime Text

## Tạo dự án React mới

### Sử dụng Create React App
\`\`\`bash
npx create-react-app my-app
cd my-app
npm start
\`\`\`

### Sử dụng Vite (khuyến nghị)
\`\`\`bash
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev
\`\`\`

## Cấu trúc thư mục

\`\`\`
my-app/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
\`\`\`

## Cài đặt extensions cho VS Code

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer`,
            order: 2,
          },
          {
            title: 'Video: Tạo component đầu tiên',
            type: 'video',
            content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 3,
          },
        ],
      },
      {
        title: '⚛️ Chương 2: Components và JSX',
        description: 'Học cách tạo và sử dụng components trong React',
        order: 2,
        lessons: [
          {
            title: 'Tìm hiểu về JSX',
            type: 'text',
            content: `# JSX - JavaScript XML

JSX là một extension syntax của JavaScript cho phép bạn viết HTML trong JavaScript.

## Cú pháp JSX cơ bản

### 1. **Element đơn giản**
\`\`\`jsx
const element = <h1>Hello, World!</h1>;
\`\`\`

### 2. **Element với attributes**
\`\`\`jsx
const element = <div className="container" id="main">Content</div>;
\`\`\`

### 3. **Element lồng nhau**
\`\`\`jsx
const element = (
  <div>
    <h1>Title</h1>
    <p>Description</p>
  </div>
);
\`\`\`

## JavaScript trong JSX

### 1. **Expression**
\`\`\`jsx
const name = 'John';
const element = <h1>Hello, {name}!</h1>;
\`\`\`

### 2. **Function calls**
\`\`\`jsx
const element = <h1>Hello, {formatName(user)}!</h1>;
\`\`\`

### 3. **Conditional rendering**
\`\`\`jsx
const element = (
  <div>
    {isLoggedIn ? <h1>Welcome back!</h1> : <h1>Please log in.</h1>}
  </div>
);
\`\`\`

## Lưu ý quan trọng

### 1. **className thay vì class**
\`\`\`jsx
// ❌ Sai
<div class="container">

// ✅ Đúng
<div className="container">
\`\`\`

### 2. **CamelCase cho attributes**
\`\`\`jsx
// ❌ Sai
<div tabindex="1" onclick={handleClick}>

// ✅ Đúng
<div tabIndex="1" onClick={handleClick}>
\`\`\`

### 3. **Self-closing tags**
\`\`\`jsx
// ❌ Sai
<img src="image.jpg"></img>

// ✅ Đúng
<img src="image.jpg" />
\`\`\``,
            order: 1,
          },
          {
            title: 'Tạo component đầu tiên',
            type: 'text',
            content: `# Tạo Component đầu tiên

## Function Component

### 1. **Component đơn giản**
\`\`\`jsx
function Welcome() {
  return <h1>Hello, World!</h1>;
}
\`\`\`

### 2. **Component với props**
\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
\`\`\`

### 3. **Sử dụng component**
\`\`\`jsx
function App() {
  return (
    <div>
      <Welcome name="Sara" />
      <Welcome name="Cahal" />
      <Welcome name="Edite" />
    </div>
  );
}
\`\`\`

## Class Component

\`\`\`jsx
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}!</h1>;
  }
}
\`\`\`

## Component với state

\`\`\`jsx
class Clock extends React.Component {
  constructor(props) {
    super(props);
    this.state = { date: new Date() };
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.tick(),
      1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({
      date: new Date()
    });
  }

  render() {
    return (
      <div>
        <h1>Hello, world!</h1>
        <h2>It is {this.state.date.toLocaleTimeString()}.</h2>
      </div>
    );
  }
}
\`\`\``,
            order: 2,
          },
          {
            title: 'Quiz: Kiến thức JSX',
            type: 'quiz',
            content: `{
  "question": "Cú pháp nào đúng trong JSX?",
  "options": [
    "class='container'",
    "className='container'",
    "class='container'",
    "className='container'"
  ],
  "correctAnswer": 1,
  "explanation": "Trong JSX, chúng ta sử dụng 'className' thay vì 'class' vì 'class' là từ khóa reserved trong JavaScript."
}`,
            order: 3,
          },
        ],
      },
      {
        title: '🎯 Chương 3: State và Props',
        description: 'Quản lý dữ liệu trong React components',
        order: 3,
        lessons: [
          {
            title: 'Tìm hiểu về Props',
            type: 'text',
            content: `# Props trong React

Props (Properties) là cách để truyền dữ liệu từ component cha xuống component con.

## Cách sử dụng Props

### 1. **Truyền props**
\`\`\`jsx
function App() {
  return <Welcome name="John" age={25} />;
}
\`\`\`

### 2. **Nhận props**
\`\`\`jsx
function Welcome(props) {
  return (
    <div>
      <h1>Hello, {props.name}!</h1>
      <p>You are {props.age} years old.</p>
    </div>
  );
}
\`\`\`

### 3. **Destructuring props**
\`\`\`jsx
function Welcome({ name, age }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>You are {age} years old.</p>
    </div>
  );
}
\`\`\`

## Default Props

\`\`\`jsx
function Welcome({ name = 'Guest', age = 0 }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>You are {age} years old.</p>
    </div>
  );
}
\`\`\`

## PropTypes (TypeScript)

\`\`\`tsx
interface WelcomeProps {
  name: string;
  age: number;
  isActive?: boolean;
}

function Welcome({ name, age, isActive = false }: WelcomeProps) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>You are {age} years old.</p>
      {isActive && <p>Status: Active</p>}
    </div>
  );
}
\`\`\``,
            order: 1,
          },
          {
            title: 'State trong React',
            type: 'text',
            content: `# State trong React

State là dữ liệu có thể thay đổi trong component. Khi state thay đổi, component sẽ re-render.

## useState Hook

### 1. **State đơn giản**
\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

### 2. **State với object**
\`\`\`jsx
function UserProfile() {
  const [user, setUser] = useState({
    name: 'John',
    age: 25,
    email: 'john@example.com'
  });

  const updateName = () => {
    setUser({ ...user, name: 'Jane' });
  };

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Age: {user.age}</p>
      <p>Email: {user.email}</p>
      <button onClick={updateName}>Update Name</button>
    </div>
  );
}
\`\`\`

### 3. **State với array**
\`\`\`jsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, { id: Date.now(), text: inputValue }]);
      setInputValue('');
    }
  };

  return (
    <div>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Add todo"
      />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
\`\`\``,
            order: 2,
          },
          {
            title: 'PDF: Tài liệu tham khảo State và Props',
            type: 'pdf',
            content: 'https://reactjs.org/docs/state-and-lifecycle.html',
            order: 3,
          },
        ],
      },
      {
        title: '🔄 Chương 4: Hooks nâng cao',
        description: 'Sử dụng các hooks phổ biến trong React',
        order: 4,
        lessons: [
          {
            title: 'useEffect Hook',
            type: 'text',
            content: `# useEffect Hook

useEffect cho phép bạn thực hiện side effects trong function components.

## Cú pháp cơ bản

\`\`\`jsx
import { useState, useEffect } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`You clicked \${count} times\`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

## Dependency Array

### 1. **Chạy sau mỗi render**
\`\`\`jsx
useEffect(() => {
  // Chạy sau mỗi render
});
\`\`\`

### 2. **Chạy một lần duy nhất**
\`\`\`jsx
useEffect(() => {
  // Chỉ chạy một lần sau mount
}, []);
\`\`\`

### 3. **Chạy khi dependency thay đổi**
\`\`\`jsx
useEffect(() => {
  // Chạy khi count thay đổi
}, [count]);
\`\`\`

## Cleanup function

\`\`\`jsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log('Timer tick');
  }, 1000);

  return () => {
    clearInterval(timer);
  };
}, []);
\`\`\``,
            order: 1,
          },
          {
            title: 'useContext và useReducer',
            type: 'text',
            content: `# useContext và useReducer

## useContext

useContext cho phép bạn sử dụng Context API một cách dễ dàng.

### 1. **Tạo Context**
\`\`\`jsx
import { createContext, useContext } from 'react';

const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
\`\`\`

### 2. **Sử dụng Context**
\`\`\`jsx
function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <button
      style={{ background: theme === 'light' ? '#fff' : '#333' }}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      Toggle Theme
    </button>
  );
}
\`\`\`

## useReducer

useReducer là một alternative cho useState khi state phức tạp.

### 1. **Reducer function**
\`\`\`jsx
function counterReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: 0 };
    default:
      throw new Error();
  }
}
\`\`\`

### 2. **Sử dụng useReducer**
\`\`\`jsx
function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}
\`\`\``,
            order: 2,
          },
        ],
      },
      {
        title: '🚀 Chương 5: Dự án thực tế',
        description: 'Xây dựng ứng dụng Todo App hoàn chỉnh',
        order: 5,
        lessons: [
          {
            title: 'Thiết kế ứng dụng Todo',
            type: 'text',
            content: `# Thiết kế ứng dụng Todo

## Yêu cầu chức năng

### 1. **Quản lý Todo**
- Thêm todo mới
- Đánh dấu hoàn thành
- Xóa todo
- Chỉnh sửa todo

### 2. **Lọc và tìm kiếm**
- Lọc theo trạng thái (All, Active, Completed)
- Tìm kiếm theo nội dung

### 3. **Thống kê**
- Hiển thị số lượng todo
- Hiển thị tiến độ hoàn thành

## Cấu trúc component

\`\`\`
TodoApp/
├── components/
│   ├── TodoForm.jsx
│   ├── TodoList.jsx
│   ├── TodoItem.jsx
│   ├── TodoFilter.jsx
│   └── TodoStats.jsx
├── hooks/
│   ├── useTodos.js
│   └── useLocalStorage.js
├── utils/
│   └── todoUtils.js
└── App.jsx
\`\`\`

## State Management

\`\`\`jsx
const [todos, setTodos] = useState([]);
const [filter, setFilter] = useState('all');
const [searchTerm, setSearchTerm] = useState('');
\`\`\``,
            order: 1,
          },
          {
            title: 'Video: Xây dựng Todo App',
            type: 'video',
            content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 2,
          },
          {
            title: 'Quiz: Kiểm tra kiến thức',
            type: 'quiz',
            content: `{
  "question": "Hook nào được sử dụng để quản lý state trong function component?",
  "options": [
    "useState",
    "useEffect", 
    "useContext",
    "useReducer"
  ],
  "correctAnswer": 0,
  "explanation": "useState là hook cơ bản nhất để quản lý state trong function component."
}`,
            order: 3,
          },
        ],
      },
    ];

    // Create modules
    for (const moduleData of modules) {
      const { lessons, ...moduleInfo } = moduleData;
      const moduleRef = await addDoc(collection(db, 'modules'), {
        ...moduleInfo,
        courseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create lessons for this module
      for (const lessonData of lessons) {
        await addDoc(collection(db, 'lessons'), {
          ...lessonData,
          moduleId: moduleRef.id,
          courseId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error('Error creating template modules and lessons:', error);
    throw error;
  }
}
