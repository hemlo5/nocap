"use client";

import { Command as CommandPrimitive } from "cmdk";
export { CommandPrimitive as Command };
export const CommandInput  = CommandPrimitive.Input;
export const CommandList   = CommandPrimitive.List;
export const CommandItem   = CommandPrimitive.Item;
export const CommandEmpty  = CommandPrimitive.Empty;
export const CommandGroup  = CommandPrimitive.Group;
export const CommandSeparator = CommandPrimitive.Separator;
export const CommandLoading   = CommandPrimitive.Loading;
