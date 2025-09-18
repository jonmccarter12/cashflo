import React from 'react';
import Image from 'next/image';

const Header: React.FC = () => {
    return (
        <header className="flex items-center justify-between p-4 bg-white shadow-md">
            <div className="flex items-center">
                <Image
                    src="/logo.png"
                    alt="Cashfl0.io Logo"
                    width={120}
                    height={40}
                    className="rounded"
                />
            </div>
            <nav>
                <ul className="flex space-x-6">
                    <li><a href="/" className="text-gray-600 hover:text-gray-800">Home</a></li>
                    <li><a href="/reports" className="text-gray-600 hover:text-gray-800">Reports</a></li>
                    <li><a href="/settings" className="text-gray-600 hover:text-gray-800">Settings</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;