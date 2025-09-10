import React from 'react';

const Header: React.FC = () => {
    return (
        <header>
            <h1>Financial Dashboard</h1>
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/reports">Reports</a></li>
                    <li><a href="/settings">Settings</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;