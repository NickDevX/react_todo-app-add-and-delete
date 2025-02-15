/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { UserWarning } from './UserWarning';
import { addTodo, deleteTodo, getTodos, USER_ID } from './api/todos';
import { Todo } from './types/Todo';
import clsx from 'clsx';

export const App: React.FC = () => {
  const input = useRef<HTMLInputElement>(null);
  const hideErrorTimer = useRef<number | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<number[] | null>(null);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [loadingError, setLoadingError] = useState({
    queryError: false,
    addError: false,
    todosError: false,
    deleteError: false,
    updateError: false,
  });

  const anyExistingError =
    loadingError.queryError ||
    loadingError.addError ||
    loadingError.todosError ||
    loadingError.deleteError ||
    loadingError.updateError;

  const focusInput = () => (input.current ? input.current.focus() : null);

  const clearError = useCallback(() => {
    if (hideErrorTimer.current) {
      clearTimeout(hideErrorTimer.current);
      hideErrorTimer.current = null;
    }

    setLoadingError({
      queryError: false,
      addError: false,
      todosError: false,
      deleteError: false,
      updateError: false,
    });
  }, []);

  const showError = useCallback(
    (errorType: keyof typeof loadingError) => {
      if (hideErrorTimer.current) {
        clearTimeout(hideErrorTimer.current);
      }

      setLoadingError(prev => ({ ...prev, [errorType]: true }));
      hideErrorTimer.current = window.setTimeout(() => {
        clearError();
        hideErrorTimer.current = null;
      }, 3000);
    },
    [clearError],
  );

  const filterTodos = useCallback((todosList: Todo[], filterBy: string) => {
    if (filterBy === 'active') {
      return todosList.filter(item => !item.completed);
    } else if (filterBy === 'completed') {
      return todosList.filter(item => item.completed);
    }

    return todosList;
  }, []);

  const visibleTodos = useMemo(
    () => filterTodos(todos, filter),
    [todos, filter, filterTodos],
  );

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    filterBy: string,
  ) => {
    event.preventDefault();
    setFilter(filterBy);
  };

  const complateTodo = (id: number) => {
    setTodos(prevTodos =>
      prevTodos.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const complateAllTodo = () => {
    if (todos.every(item => item.completed)) {
      setTodos(prevTodos =>
        prevTodos.map(item => ({ ...item, completed: false })),
      );
    } else {
      setTodos(prevTodos =>
        prevTodos.map(item => ({ ...item, completed: true })),
      );
    }
  };

  const removeTodo = (id: number) => {
    setDeletingTodoId([id]);
    const removeTodoFromServer = async () => {
      try {
        const response = (await deleteTodo(id)) as number;

        if (response !== 1) {
          throw new Error();
        }

        setTodos(prev => prev.filter(item => item.id !== id));
      } catch {
        showError('deleteError');
      } finally {
        setDeletingTodoId(null);
        focusInput();
      }
    };

    removeTodoFromServer();
  };

  const removeCompletedTodos = () => {
    const completedIds = todos
      .filter(item => item.completed)
      .map(item => item.id);

    setDeletingTodoId(completedIds);
    const removeTodoFromServer = async () => {
      try {
        const response = completedIds.map(async id => deleteTodo(id));
        const res = await Promise.allSettled(response);

        setTodos(prev =>
          prev.filter(item => {
            if (!completedIds.includes(item.id)) {
              return true;
            }

            const result = res.find(
              (_resItem, index) => completedIds[index] === item.id,
            );

            return result?.status !== 'fulfilled';
          }),
        );
        const hasError = res.some(item => item.status === 'rejected');

        if (hasError) {
          showError('deleteError');
        }
      } catch {
        showError('deleteError');
      } finally {
        setDeletingTodoId(null);
        focusInput();
      }
    };

    removeTodoFromServer();
  };

  const checkTodoCompleted = useCallback(() => {
    return todos.some(item => item.completed);
  }, [todos]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length === 0) {
      showError('queryError');

      return;
    }

    const createTodo = async () => {
      try {
        const response = await addTodo(title.trim());

        setTodos(prevTodos => [...prevTodos, response]);
        setTempTodo(null);
        setTitle('');
        clearError();
      } catch (error) {
        showError('addError');
        setTempTodo(null);
      } finally {
        focusInput();
      }
    };

    setTempTodo({ id: 0, title, completed: false, userId: USER_ID });
    createTodo();
  };

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const todosFromServer = (await getTodos()) as Todo[];

        setTodos(todosFromServer);
        requestAnimationFrame(() => focusInput());
      } catch (error) {
        showError('todosError');
      }
    };

    fetchTodos();
  }, [showError]);

  useEffect(() => {
    if (tempTodo === null) {
      focusInput();
    }
  }, [tempTodo]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className={clsx('todoapp')}>
      <h1 className={clsx('todoapp__title')}>todos</h1>
      <div className={clsx('todoapp__content')}>
        <header className={clsx('todoapp__header')}>
          {todos.length > 0 && (
            <button
              type="button"
              className={clsx('todoapp__toggle-all', {
                active: todos.every(item => item.completed),
              })}
              data-cy="ToggleAllButton"
              onClick={complateAllTodo}
            />
          )}
          <form onSubmit={handleSubmit} method="post">
            <input
              data-cy="NewTodoField"
              type="text"
              value={title}
              ref={input}
              onChange={handleTitleChange}
              disabled={tempTodo !== null}
              className={clsx('todoapp__new-todo')}
              placeholder="What needs to be done?"
            />
          </form>
        </header>

        <section className={clsx('todoapp__main')} data-cy="TodoList">
          {visibleTodos.map(todoItem => (
            <div
              data-cy="Todo"
              className={clsx('todo', { completed: todoItem.completed })}
              key={todoItem.id}
            >
              <label className={clsx('todo__status-label')}>
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className={clsx('todo__status')}
                  checked={todoItem.completed}
                  onChange={() => complateTodo(todoItem.id)}
                />
              </label>
              <span data-cy="TodoTitle" className={clsx('todo__title')}>
                {todoItem.title}
              </span>
              <button
                type="button"
                className={clsx('todo__remove')}
                data-cy="TodoDelete"
                onClick={() => removeTodo(todoItem.id)}
              >
                ×
              </button>
              <div
                data-cy="TodoLoader"
                className={clsx('modal', 'overlay', {
                  'is-active': deletingTodoId?.includes(todoItem.id),
                })}
              >
                <div
                  className={clsx(
                    'modal-background',
                    'has-background-white-ter',
                  )}
                />
                <div className={clsx('loader')} />
              </div>
            </div>
          ))}
          {tempTodo && (
            <div
              data-cy="Todo"
              className={clsx('todo', { completed: tempTodo.completed })}
              key={tempTodo.id}
            >
              <label className={clsx('todo__status-label')}>
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className={clsx('todo__status')}
                  checked={tempTodo.completed}
                  onChange={() => complateTodo(tempTodo.id)}
                />
              </label>
              <span data-cy="TodoTitle" className={clsx('todo__title')}>
                {tempTodo.title}
              </span>
              <button
                type="button"
                className={clsx('todo__remove')}
                data-cy="TodoDelete"
                onClick={() => removeTodo(tempTodo.id)}
              >
                ×
              </button>
              <div
                data-cy="TodoLoader"
                className={clsx('modal', 'overlay', {
                  'is-active': tempTodo,
                })}
              >
                <div
                  className={clsx(
                    'modal-background',
                    'has-background-white-ter',
                  )}
                />
                <div className={clsx('loader')} />
              </div>
            </div>
          )}
        </section>

        {todos.length > 0 && (
          <footer className={clsx('todoapp__footer')} data-cy="Footer">
            <span className={clsx('todo-count')} data-cy="TodosCounter">
              {todos.filter(item => !item.completed).length} items left
            </span>
            <nav className={clsx('filter')} data-cy="Filter">
              <a
                href="#/"
                className={clsx('filter__link', {
                  selected: filter === 'all',
                })}
                data-cy="FilterLinkAll"
                onClick={event => handleClick(event, 'all')}
              >
                All
              </a>
              <a
                href="#/active"
                className={clsx('filter__link', {
                  selected: filter === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={event => handleClick(event, 'active')}
              >
                Active
              </a>
              <a
                href="#/completed"
                className={clsx('filter__link', {
                  selected: filter === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={event => handleClick(event, 'completed')}
              >
                Completed
              </a>
            </nav>
            <button
              type="button"
              className={clsx('todoapp__clear-completed')}
              data-cy="ClearCompletedButton"
              onClick={removeCompletedTodos}
              disabled={!checkTodoCompleted() && todos.length > 0}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>
      <div
        data-cy="ErrorNotification"
        className={clsx(
          'notification',
          'is-danger',
          'is-light',
          'has-text-weight-normal',
          { hidden: !anyExistingError },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className={clsx('delete')}
          onClick={clearError}
        />
        {loadingError.todosError && (
          <>
            Unable to load todos
            <br />
          </>
        )}
        {loadingError.queryError && (
          <>
            Title should not be empty
            <br />
          </>
        )}
        {loadingError.addError && (
          <>
            Unable to add a todo
            <br />
          </>
        )}
        {loadingError.deleteError && (
          <>
            Unable to delete a todo
            <br />
          </>
        )}
        {loadingError.updateError && 'Unable to update a todo'}
      </div>
    </div>
  );
};
