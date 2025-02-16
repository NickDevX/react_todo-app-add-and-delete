import clsx from 'clsx';
import React from 'react';
import { Todo } from '../../types/Todo';

type Props = {
  todos: Todo[];
  filter: string;
  checkTodoCompleted: () => boolean;
  removeCompletedTodos: () => void;
  handleClick: (
    event: React.MouseEvent<HTMLAnchorElement>,
    filterBy: string,
  ) => void;
};

export const Footer: React.FC<Props> = ({
  todos,
  filter,
  checkTodoCompleted,
  removeCompletedTodos,
  handleClick,
}) => {
  return (
    <footer className="todoapp__footer" data-cy="Footer">
      <span className="todo-count" data-cy="TodosCounter">
        {todos.filter(item => !item.completed).length} items left
      </span>
      <nav className="filter" data-cy="Filter">
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
        className="todoapp__clear-completed"
        data-cy="ClearCompletedButton"
        onClick={removeCompletedTodos}
        disabled={!checkTodoCompleted() && todos.length > 0}
      >
        Clear completed
      </button>
    </footer>
  );
};
