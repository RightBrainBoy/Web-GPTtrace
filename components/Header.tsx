import React from 'react';
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <div className="flex justify-between items-center w-full mt-5 border-b-2 pb-1 sm:px-4 px-2 ">
      <Link href="/" className="flex space-x-3 ml-10">
        <Image
          alt="header text"
          src="/OpenCopilot.png"
          className="sm:w-12 sm:h-12 