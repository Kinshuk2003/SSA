import { Button, InputGroup } from '@blueprintjs/core';

interface NavbarProps {
  search:         string;
  onSearchChange: (value: string) => void;
  onAddRecord:    () => void;
}

export function AppNavbar({ search, onSearchChange, onAddRecord }: NavbarProps) {
  return (
    <header className="ssa-navbar">
      <div className="ssa-navbar-left">
        <span className="ssa-logo">SSA</span>
        <span className="ssa-navbar-title">Mission Control</span>
      </div>

      <div className="ssa-navbar-right">
        <InputGroup
          className="ssa-search ssa-navbar-search"
          leftIcon="search"
          placeholder="Search NORAD ID, COSPAR, name, owner…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          rightElement={
            search ? (
              <Button minimal icon="cross" onClick={() => onSearchChange('')} />
            ) : undefined
          }
        />
        <Button
          intent="primary"
          icon="plus"
          text="Add Record"
          onClick={onAddRecord}
        />
      </div>
    </header>
  );
}